/*jslint nomen:true, devel:true */
/*global Geosite, $, _*/

(function (N) {
    "use strict";
    N.app = {
        // Model and View instances (see Geosite.js for "class" objects)
        models: {},
        views: {},
        templates: {},

        init: function initializeApp(regionData) {
            initializePane(regionData);
        },
        
        initializePane: function initializePane(regionData) {
            var pane = new N.models.Pane({
                regionData: regionData
            });
            N.app.models.pane = pane;

            var paneView = new N.views.Pane({
                model: pane,
                el: $('#pane')
            });
            N.app.views.pane = paneView;

            paneView.render();
        }
    }

    new N.TemplateLoader().load(N.app.templates);

}(Geosite));
