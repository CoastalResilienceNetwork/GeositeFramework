/*jslint nomen:true, devel:true */
/*global Geosite, $, _*/

(function (N) {
    "use strict";
    N.app = {
        // Model and View instances (see Geosite.js for "class" objects)
        models: {},
        views: {},
        templates: {},

        init: function initializeApp(regionData, pluginClasses) {
            N.plugins = pluginClasses;
            initializePanes(regionData);
        }
    };

    function initializePanes(regionData) {
        _.each([1, 2], function (i) {
            initializePane(regionData, i);
        });
    }

    function initializePane(regionData, i) {
        var pane = new N.models.Pane({
            paneNumber: i,
            regionData: regionData
        });
        var paneView = new N.views.Pane({
            model: pane,
            el: $('#pane' + i)
        });

        // Render the pane, then create the map (which needs a DOM element to live in)
        paneView.render();
        var esriMap = paneView.createMap();

        // Wait for the map to load, then initialize the plugins. 
        // (Otherwise some map properties aren't available, e.g. extent)
        dojo.connect(esriMap, "onLoad", function () {
            var wrappedMap = N.createMapWrapper(esriMap);
            pane.initPlugins(wrappedMap);
        });

    }

    new N.TemplateLoader().load(N.app.templates);

}(Geosite));
