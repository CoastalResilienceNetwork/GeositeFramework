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
        N.app.models.panes[paneConfig.index] = pane;

        N.app.views.panes[paneConfig.index] = new N.views.Pane({
            model: pane,
            el: $(paneConfig.selector)
        });
    }

    new N.TemplateLoader().load(N.app.templates);

}(Geosite));
