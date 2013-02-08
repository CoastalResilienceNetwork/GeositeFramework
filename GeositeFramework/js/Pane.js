/*jslint nomen:true, devel:true */
/*global Backbone, _, $, Geosite*/

// A pane represents the app work area and contains a sidebar and a map

(function (N) {
    'use strict';
    var model = null;

    function initializePane(paneModel) {
        model = paneModel;
        createPlugins();
    }

    function createPlugins() {
        model.set('plugins', []);

        _.each(N.plugins, function (pluginClass) {
            var plugin = new pluginClass();
            model.get('plugins').push(plugin);
        });
    }

    // initPlugins() is separate from createPlugins() because:
    //     - We need to create plugin objects before rendering (so we can render their toolbar names).
    //     - We need to pass a map object to the plugin constructors, but that isn't available until after rendering. 

    function initPlugins(esriMap) {
        var mapWrapper = getMapWrapper(esriMap);
        _.each(model.get('plugins'), function (plugin) {
            plugin.constructor({
                map: mapWrapper
            });
        });
    }

    function getMapWrapper(esriMap) {
        var wrapper = _.extend({}, esriMap);
        return wrapper;
    }

    N.models = N.models || {};
    N.models.Pane = Backbone.Model.extend({
        initialize: function () {
            initializePane(this);
        },
        initPlugins: initPlugins
    });

}(Geosite));

(function (N) {
    'use strict';
    var view = null;
    var model = null;

    function renderPane(paneView) {
        view = paneView;
        model = view.model;
        renderSelf();
        renderPlugins();
        renderSidebarLinks();
        return view;
    }

    function renderSelf() {
        var paneTemplate = N.app.templates['template-pane'],
            html = paneTemplate();
        view.$el.append(html);
    }

    function renderPlugins() {
        var regionData = model.get('regionData'),
            plugins = model.get('plugins'),
            toolTemplate = N.app.templates['template-sidebar-plugin'],
            $tools = view.$('.plugins');
        _.each(plugins, function (plugin) {
            var html = toolTemplate({ toolbarName: plugin.toolbarName });
            $tools.append(html);
        });
    }

    function renderSidebarLinks() {
        var regionData = model.get('regionData'),
            linkTemplate = N.app.templates['template-sidebar-link'],
            $links = view.$('.sidebar-links');
        _.each(regionData.sidebarLinks, function (link) {
            var html = linkTemplate({ link: link });
            $links.append(html);
        });
    }

    function createMap() {
        var paneNumber = model.get('paneNumber'),
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
        render: function () {
            renderPane(this);
        },
        createMap: createMap
    });

}(Geosite));
