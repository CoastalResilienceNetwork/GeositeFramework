/*jslint nomen:true, devel:true */
/*global Backbone, _, $, Geosite*/

// A pane represents the app work area and contains a sidebar and a map

(function (N) {
    'use strict';

    function initialize(model) {
        initMap(model);
        createPlugins(model);
    }

    function initMap(model) {
        var regionData = model.get('regionData');
        model.set('map', new N.models.Map({
            basemaps: regionData.basemaps,
            initialExtent: regionData.initialExtent
        }));
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

    function initPlugins(model, esriMap) {
        model.get('plugins').each(function (pluginModel) {
            var pluginObject = pluginModel.get('pluginObject'),
                // The display container used in the model view will be created
                // here so the plugin object can be constructed with a reference
                // to it.
                $displayContainer = $(N.app.templates['template-plugin-container']().trim());

            pluginModel.set('$displayContainer', $displayContainer);
            pluginObject.initialize({
                app: null,
                map: N.createMapWrapper(esriMap),
                container: $displayContainer.find('.plugin-container-inner')[0]
            });
        });
    }

    N.models = N.models || {};
    N.models.Pane = Backbone.Model.extend({
        defaults: {
            paneNumber: 0,
            isMain: false,
            regionData: null,
            map: null,
            plugins: null,
            splitView: false

        },
        initialize: function () { return initialize(this); },
        initPlugins: function (esriMap) { return initPlugins(this, esriMap); }
    });

}(Geosite));

(function (N) {
    'use strict';

    function initialize(view) {
        render(view);
        initBasemapSelector(view);
        initMapView(view);
        renderSidebar(view);
        initPluginViews(view);

        view.model.on('change:isMain change:splitView', function () { renderSidebar(view); });

    }

    function render(view) {
        var paneTemplate = N.app.templates['template-pane'],
            html = paneTemplate(view.model.toJSON());
        view.$el.append(html);
    }

    function renderSidebar(view) {
        var sidebarTemplate = N.app.templates['template-sidebar'],
            html = sidebarTemplate(_.extend(view.model.toJSON(), {
                alternatePaneNumber: view.model.get('paneNumber') == 0 ? 1 : 0
            }));

        view.$('.bottom.side-nav').empty().append(html);
        renderSidebarLinks(view);
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
        // If only the first pane has been created, create the right-pane (id-1)
        if (N.app.models.panes.length < 2) {
            N.app.createPane(1);
        }

        // Update the pane models with the correct state for main pane and 
        // split screen status
        _.each(N.app.models.panes, function (pane) {
            var isMainPane = pane.get('paneNumber') === mainPainIndex;

            pane.set({
                'splitView': splitView,
                'isMain': isMainPane
            });
        });
    }

    function initBasemapSelector(view) {
        new Geosite.views.BasemapSelector({
            model: view.model.get('map'),
            el: view.$('.basemap-selector')
        });
    }

    function initMapView(view) {
        var mapView = new Geosite.views.Map({
            model: view.model.get('map'),
            el: view.$('.map'),
            paneNumber: view.model.get('paneNumber')
        });

        // Wait for the map to load, then initialize the plugins. 
        // (Otherwise some map properties aren't available, e.g. extent)
        var esriMap = mapView.esriMap;
        dojo.connect(esriMap, "onLoad", function () {
            view.model.initPlugins(esriMap);
        });
    }

    function initPluginViews(view) {
        // create a view for each plugin model (it will render), and add its element
        // to the appropriate plugin section
        var $sidebar = view.$('.plugins'),
            $topbar = view.$('.tools');

        view.model.get('plugins').each(function (plugin) {
            var toolbarType = plugin.get('pluginObject').toolbarType;
            if (toolbarType === 'sidebar') {
                var pluginView = new N.views.SidebarPlugin({ model: plugin });
                $sidebar.append(pluginView.$el);
            } else if (toolbarType === 'map') {
                var pluginView = new N.views.TopbarPlugin({ model: plugin });
                $topbar.append(pluginView.$el);
            }
        });
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

        initialize: function (view) { initialize(this); },

        render: function () { return renderPane(this); },

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
