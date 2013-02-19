/*jslint nomen:true, devel:true */
/*global Backbone, _, $, Geosite*/

// A pane represents the app work area and contains a sidebar and a map

(function (N) {
    'use strict';

    function initializePane(model) {
        createPlugins(model);
    }

    function createPlugins(model) {
        // Iterate over plugin classes in top-level namespace,
        // instantiate them, and wrap them in backbone objects

        var plugins = new N.collections.Plugins();

        _.each(N.plugins, function (PluginClass, i) {
            var pluginObject = new PluginClass(),
                plugin = new N.models.Plugin({
                    pluginObject: pluginObject,
                    pluginSrcFolder: model.get('regionData').pluginFolderNames[i]
                });

            // Load plugin only if it passes a compliance check
            if (plugin.isCompliant()) {
                plugins.add(plugin);
            } else {
                console.log('Plugin: Pane[' + model.get('paneNumber') + '] - ' + 
                    pluginObject.toolbarName +
                    ' is not loaded due to improper interface');
            }
        });

        model.set('plugins', plugins);
    }

    // initPlugins() is separate from createPlugins() because:
    //     - We need to create plugin objects before rendering (so we can render their toolbar names).
    //     - We need to pass a map object to the plugin constructors, but that isn't available until after rendering. 

    function initPlugins(model, wrappedMap) {
        var paneNumber = model.get('paneNumber');

        model.get('plugins').each(function (pluginModel) {
            var pluginObject = pluginModel.get('pluginObject'),
                // The display container used in the model view will be created
                // here so the plugin object can be constructed with a reference
                // to it.
                $displayContainer = $(N.app.templates['template-plugin-container']().trim());

            pluginModel.set('$displayContainer', $displayContainer);
            pluginObject.initialize({
                app: null,
                map: wrappedMap,
                container: $displayContainer[0]  
            });
        });
    }

    N.models = N.models || {};
    N.models.Pane = Backbone.Model.extend({
        defaults: {
            plugins: null,
            pluginViews: null,
            isMain: false,
            splitView: false
        },
        initialize: function () { return initializePane(this); },
        initPlugins: function (wrappedMap) { return initPlugins(this, wrappedMap); }
    });

}(Geosite));

(function (N) {
    'use strict';

    function renderPane(view) {
        renderSelf(view);
        renderSidebar(view);
        return view;
    }

    function renderSelf(view) {
        var paneTemplate = N.app.templates['template-pane'],
            html = paneTemplate(view.model.toJSON());
        view.$el.append(html);
    }

    function renderSidebar(view) {
        var sidebarTemplate = N.app.templates['template-sidebar'],
            html = sidebarTemplate(_.extend(view.model.toJSON(), {
                alternatePaneNumber: view.model.get('paneNumber') == 0 ? 1 : 0
            }));

        view.$el.find('.side-nav').empty().append(html);

        renderPlugins(view);
        renderSidebarLinks(view);
    }

    function renderPlugins(view) {
        // For each model, render its view and add them
        // to the appropriate plugin section
        var $sidebar = view.$('.plugins').empty(),
            $topbar = view.$('.tools').empty();

        view.model.get('plugins').each(function (plugin) {
            var toolbarType = plugin.get('pluginObject').toolbarType;

            if (toolbarType === 'sidebar') {
                var pluginView = new N.views.SidebarPlugin({ model: plugin });
                $sidebar.append(pluginView.render().$el);

            } else if (toolbarType === 'map') {
                var pluginView = new N.views.TopbarPlugin({ model: plugin });
                $topbar.append(pluginView.render().$el);
            }
        });
    }

    // TODO: Sidebar links aren't in the prototype - do we have anything for them?
    function renderSidebarLinks(view) {
        var regionData = view.model.get('regionData'),
            linkTemplate = N.app.templates['template-sidebar-link'],
            $links = view.$('.sidebar-links');
        _.each(regionData.sidebarLinks, function (link) {
            var html = linkTemplate({ link: link });
            $links.append(html);
        });
    }

    function changeScreenModeOnPanes(mainPainIndex, splitView) {
        if (N.app.models.panes.length < 2) {
            N.app.createPane(1);
        }

        _.each(N.app.models.panes, function (pane) {
            var isMainPane = false;
            if (pane.get('paneNumber') === mainPainIndex) {
                isMainPane = true;
            }
            pane.set({
                'splitView': splitView,
                'isMain': isMainPane
            });
        });
    }

    function createMap(view) {
        var paneNumber = view.model.get('paneNumber'),
            $map = view.$('.map'),
            domId = "map" + paneNumber;
        $map.attr("id", domId);
        view.esriMap = new esri.Map(domId, {
            // center: [-56.049, 38.485],
            zoom: 4,
            basemap: "streets"
        });

        function resizeMap() {
            // When the element containing the map resizes, the 
            // map needs to be notified
            _.delay(function () {
                if (view.$el.find('.map').is(':visible')) {
                    view.esriMap.reposition();
                    view.esriMap.resize(true);
                } 
            }, 150);
            
        }
        resizeMap();
        $(N).on('resize', resizeMap);

        return view.esriMap;
    }

    N.views = N.views || {};
    N.views.Pane = Backbone.View.extend({
        esriMap: null,
        screen: {
            split: 'view-split',
            left: 'view-left',
            right: 'view-right'
        },

        $body: $('body'),

        initialize: function initPaneView() {
            this.model.on('change:isMain change:splitView', this.renderSidebar, this);
        },

        render: function () { return renderPane(this); },

        renderSidebar: function() {return renderSidebar(this);}, 

        createMap: function () { return createMap(this); },

        events: {
            'click .split-screen': 'splitScreen',
            'click .switch-screen': 'switchScreenFocus'
        },

        switchScreenFocus: function switchScreen(evt) {
            var screenToShow = $(evt.currentTarget).data('screen'),
                screenClass = screenToShow === 0 ? this.screen.left : this.screen.right;

            this.$body.removeClass(_(this.screen).values().join(' '))
                .addClass(screenClass)

            changeScreenModeOnPanes(screenToShow, false);
            $(window).trigger('resize');
        },

        splitScreen: function splitScreen() {
            // Align the body classes to be in split-screen mode
            this.$body.removeClass(_(this.screen).values().join(' '))
                .addClass(this.screen.split);

            // Main screen is always id-0 when in split view mode
            changeScreenModeOnPanes(0, true);

            // The maps need to adjust to the new layout size
            $(window).trigger('resize');
        }
    });

}(Geosite));
