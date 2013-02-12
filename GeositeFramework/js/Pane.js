/*jslint nomen:true, devel:true */
/*global Backbone, _, $, Geosite*/

// A pane represents the app work area and contains a sidebar and a map

(function (N) {
    'use strict';

    function initializePane(model) {
        createPlugins(model);
    }

    function createPlugins(model) {
        var plugins = [];
        _.each(N.plugins, function (pluginClass) {
            var plugin = new pluginClass();
            plugins.push(plugin);
        });
        model.set('plugins', plugins);
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
        var regionData = view.model.get('regionData'),
            plugins = view.model.get('plugins'),
            toolTemplate = N.app.templates['template-sidebar-plugin'],
            $tools = view.$('.plugins');
        _.each(plugins, function (plugin) {
            var html = toolTemplate({ toolbarName: plugin.toolbarName });
            $tools.append(html);
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
