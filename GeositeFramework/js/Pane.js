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

        var plugins = [],
            pluginViews = [];

        _.each(N.plugins, function (pluginClass) {
            var pluginObject = new pluginClass();
            var plugin = new N.models.Plugin({ pluginObject: pluginObject });
            var pluginView = new N.views.Plugin({ model: plugin });

            plugins.push(plugin);
            pluginViews.push(pluginView);
        });

        model.set({
            plugins: plugins,
            pluginViews: pluginViews
        });
        model.set('plugins', plugins);
    }

    // initPlugins() is separate from createPlugins() because:
    //     - We need to create plugin objects before rendering (so we can render their toolbar names).
    //     - We need to pass a map object to the plugin constructors, but that isn't available until after rendering. 

    function initPlugins(model, wrappedMap) {
        _.each(model.get('plugins'), function (pluginModel) {
            var pluginObject = pluginModel.get('pluginObject');
            if (_.isFunction(pluginObject.initialize)) {
                pluginObject.initialize({
                    app: null,
                    map: wrappedMap,
                    container: $('#pane1')[0]  // TODO: use plugin-specific DOM element
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
            html = paneTemplate();
        view.$el.append(html);
    }

    function renderPlugins(view) {
        // for each model that wraps a plugin object:
        // render its view and add them to the sidebar
        // section for plugin icons
        var $tools = view.$('.plugins');
        _.each(view.model.get('pluginViews'),
            function (pluginView) {
                $tools.append(pluginView.render().$el);
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
        return esriMap;
    }

    N.views = N.views || {};
    N.views.Pane = Backbone.View.extend({
        render: function () { return renderPane(this); },
        createMap: function () { return createMap(this); }
    });

}(Geosite));
