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

            plugins.add(plugin);
        });

        model.set('plugins', plugins);
    }

    // initPlugins() is separate from createPlugins() because:
    //     - We need to create plugin objects before rendering (so we can render their toolbar names).
    //     - We need to pass a map object to the plugin constructors, but that isn't available until after rendering. 

    function initPlugins(model, wrappedMap) {
        var paneNumber = model.get('paneNumber');
        model.get('plugins').each(function (pluginModel) {
            var pluginObject = pluginModel.get('pluginObject');
            if (_.isFunction(pluginObject.initialize)) {
                pluginObject.initialize({
                    app: null,
                    map: wrappedMap,
                    container: N.app.views.panes[paneNumber].el  // TODO: use plugin-specific DOM element
                });
            }
        });
    }

    N.models = N.models || {};
    N.models.Pane = Backbone.Model.extend({
        defaults: {
            plugins: null,
            pluginViews: null
        },
        initialize: function () { return initializePane(this); },
        initPlugins: function (wrappedMap) { return initPlugins(this, wrappedMap); }
    });

}(Geosite));

(function (N) {
    'use strict';

    function renderPane(view) {
        renderSelf(view);
        renderPlugins(view);
        renderSidebarLinks(view);
        return view;
    }

    function renderSelf(view) {
        var paneTemplate = N.app.templates['template-pane'],
            html = paneTemplate({
                index: view.model.get('paneNumber'),
                isMain: view.model.get('isMain')
            });
        view.$el.append(html);
    }

    function renderPlugins(view) {
        // for each model, render its view and add them
        // to the appropriate plugin section
        var $sidebar = view.$('.plugins'),
            $topbar = view.$('.tools');

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

    function renderSidebarLinks(view) {
        var regionData = view.model.get('regionData'),
            linkTemplate = N.app.templates['template-sidebar-link'],
            $links = view.$('.sidebar-links');
        _.each(regionData.sidebarLinks, function (link) {
            var html = linkTemplate({ link: link });
            $links.append(html);
        });
    }

    function createMap(view) {
        var paneNumber = view.model.get('paneNumber'),
            $map = view.$('.map'),
            domId = "map" + paneNumber;
        $map.attr("id", domId);
        var esriMap = new esri.Map(domId, {
            // center: [-56.049, 38.485],
            zoom: 4,
            basemap: "streets"
        });

        function resizeMap() {
            esriMap.resize();
            esriMap.reposition();
        }
        resizeMap();
        $(window).on('resize', resizeMap);

        return esriMap;
    }

    N.views = N.views || {};
    N.views.Pane = Backbone.View.extend({
        render: function () { return renderPane(this); },
        createMap: function () { return createMap(this); }
    });

}(Geosite));
