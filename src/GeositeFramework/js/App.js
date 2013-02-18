/*jslint nomen:true, devel:true */
/*global Geosite, $, _*/

(function (N) {
    "use strict";
    N.app = {
        // Model and View instances (see Geosite.js for "class" objects)
        models: {
            panes: []
        },
        views: {
            panes: []
        },
        templates: {},

        init: function initializeApp(regionData, pluginClasses) {
            N.plugins = pluginClasses;
            initializePanes(regionData);
            initializeMaps();
        }
    };

    function initializeMaps() {
        function resizeMap() {
            var sideWid = $('.sidebar').width(),
                fullWid = $('.content').width(),
                mapWid = fullWid - sideWid;

            $('.map').width(mapWid);
        }

        resizeMap();
        $(window).resize(_.debounce(resizeMap, 300));

    }

    function initializePanes(regionData) {
        // The main pane will contain the app tool buttons
        var panes = [
            { selector: "#left-pane", index: 0, main: true },
            { selector: "#right-pane", index: 1, main: false}
        ];

        _.each(panes, function (pane) {
            initializePane(regionData, pane);
        });
    }

    function initializePane(regionData, paneConfig) {
        var pane = new N.models.Pane({
            paneNumber: paneConfig.index,
            isMain: paneConfig.main,
            regionData: regionData
        });
        N.app.models.panes[pane.index] = pane;
        var paneView = new N.views.Pane({
            model: pane,
            el: $(paneConfig.selector)
        });
        N.app.views.panes[paneConfig.index] = paneView;

        // Render the pane, then create the map (which needs a DOM element to live in)
        paneView.render();
        var esriMap = paneView.createMap();
        var x = regionData.initialExtent;
        esriMap.setExtent(new esri.geometry.Extent(x[0], x[1], x[2], x[3], new esri.SpatialReference({ wkid: 4326 /*lat-long*/})));

        // Wait for the map to load, then initialize the plugins. 
        // (Otherwise some map properties aren't available, e.g. extent)
        dojo.connect(esriMap, "onLoad", function () {
            var wrappedMap = N.createMapWrapper(esriMap);
            pane.initPlugins(wrappedMap);
        });
    }

    new N.TemplateLoader().load(N.app.templates);

}(Geosite));
