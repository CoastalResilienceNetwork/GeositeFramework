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
            regionData: regionData
        });

        var paneView = new N.views.Pane({
            model: pane,
            el: $('#pane' + i)
        });

        paneView.render();
    }

    new N.TemplateLoader().load(N.app.templates);

}(Geosite));
