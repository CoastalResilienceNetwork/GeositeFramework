/*jslint nomen:true, devel:true */
/*global Geosite, $, _*/

(function (N) {
    "use strict";
    N.app = {
        // Model and View instances (see Geosite.js for "class" objects)
        models: [],
        views: [],
        templates: {},
        data: {},
        hashModels: null,

        init: function initializeApp(version, regionData, pluginClasses) {
            N.app.version = version;
            N.app.data.region = regionData;
            N.plugins = pluginClasses;

            this.hashModels = Backbone.HashModels.init({
                updateOnChange: false
            });
            N.app.models.screen = new N.models.Screen();
            this.hashModels.addModel(N.app.models.screen);
            N.app.views.screen = new N.views.Screen({
                model: N.app.models.screen,
                el: $('body')
            });

            initResizeHandler();

            // Setup a manager for synced maps.  As maps are created, 
            // they will be added to it.
            N.app.syncedMapManager = new N.SyncedMapManager(N.app.models.screen);
        },

        createPane: function createPane(paneIndex) {
            initializePane(N.app.data.region, N.app.config.paneDefinitions[paneIndex]);
        }
    };

    function initResizeHandler() {

        function resizeMap() {
            $(N).trigger('resize');
        }

        $(window).resize(_.debounce(resizeMap, 300));
    }

    new N.TemplateLoader().load(N.app.templates);

}(Geosite));
