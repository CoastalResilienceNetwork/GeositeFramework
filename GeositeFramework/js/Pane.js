/*jslint nomen:true, devel:true */
/*global Backbone, _, $, Geosite*/

// A pane represents the app work area and contains a sidebar and a map

(function (N) {
    'use strict';

    function initializePane(model) {
        createPlugins(model);
    }

    function createPlugins(model) {
        // Iterate over plugin objects in top-level namespace
        // and add them to an array in the pane model.
        // also instantiate a backbone model and view to wrap
        // around these plugin objects and add them to
        // arrays in the pane model as well.

        model.set({
            plugins: [],
            pluginViews: []
        });

        _.each(N.plugins, function (pluginClass) {
            var pluginObject = new pluginClass();
            var plugin = new N.models.Plugin({ pluginObject: pluginObject });
            var pluginView = new N.views.Plugin({ model: plugin });

            model.get('plugins').push(plugin);
            //TODO : should we manually trigger an event here
            model.get('pluginViews').push(pluginView);
        });
    }

    // initPlugins() is separate from createPlugins() because:
    //     - We need to create plugin objects before rendering (so we can render their toolbar names).
    //     - We need to pass a map object to the plugin constructors, but that isn't available until after rendering. 

    function initPlugins(model, wrappedMap) {
        _.each(model.get('plugins'), function (plugin) {
            plugin.constructor({
                map: wrappedMap
            });
        });
    }

    N.models = N.models || {};
    N.models.Pane = Backbone.Model.extend({
        defaults: {
            plugins: null,
            pluginViews: null
        },
        initialize: function () { initializePane(this); },
        initPlugins: function (wrappedMap) { initPlugins(this, wrappedMap); }
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
        render: function () { renderPane(this); },
        createMap: function () { createMap(this); }
    });

}(Geosite));
