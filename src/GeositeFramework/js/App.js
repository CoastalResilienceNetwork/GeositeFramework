/*jslint nomen:true, devel:true */
/*global Geosite, $, _, gapi*/

(function (N) {
    "use strict";
    N.app = {
        // Model and View instances (see Geosite.js for "class" objects)
        models: [],
        views: [],
        controllers: {},
        templates: {},
        data: {},
        hashModels: null,

        init: function initializeApp(version, regionData, pluginClasses) {
            N.app.version = version;
            N.app.data.region = regionData;
            N.plugins = pluginClasses;

            // Set up the google url shortener service
            gapi.client.load('urlshortener', 'v1');
            if (regionData.googleUrlShortenerApiKey) {
                gapi.client.setApiKey(regionData.googleUrlShortenerApiKey);
            }

            N.app.controllers.help = new N.controllers.HelpOverlay();
            N.app.models.screen = new N.models.Screen();

            this.hashModels = Backbone.HashModels.init({
                updateOnChange: false,
                hashUpdateCallback: this.showHashUrlPopup,
                setupHashMonitorCallback: this.setupHashMonitorCallback
            });
            this.hashModels.addModel(N.app.models.screen, {
                id: 'screen',
                attributes: ['splitScreen', 'syncMaps']
            });

            N.app.views.screen = new N.views.Screen({
                model: N.app.models.screen,
                el: $('body')
            });

            initResizeHandler();

            // Setup a manager for synced maps.  As maps are created, 
            // they will be added to it.
            N.app.syncedMapManager = new N.SyncedMapManager(N.app.models.screen);

            registerPopupHandlers();
        },

        showHashUrlPopup: function (hash) {
            var permalink = new N.models.Permalink({ hash: hash }),
                popup = new N.views.Permalink({
                    model: permalink
                });
        },

        setupHashMonitorCallback: function (handleHashChangedFn) {
            // Process the hash once using the handleHashChanged
            // function, then clear it. This is done instead of the
            // typical behavior of HashModels which is to continue
            // listening for changes in the location.hash
            
            // IE8 will throw a syntax error if the hash contains a single
            // # character before entering hashmodels
            handleHashChangedFn(location.hash === '#' ? '' : location.hash);
            location.hash = "";
        }
    };

    function initResizeHandler() {

        function resizeMap() {
            var bottomHeight         = $('.side-nav.bottom:visible').height(),
                sidebarHeight        = $('.sidebar:visible').height(),
                rightBottomHeight    = $('#right-pane:visible .side-nav.bottom').height();
            
            $('.side-nav.top:visible').height(sidebarHeight - bottomHeight);
            $('#right-pane .side-nav.top').height(sidebarHeight - rightBottomHeight);
            $(N).trigger('resize');
        }

        resizeMap();
        $(window).resize(_.debounce(resizeMap, 300));
    }

    function registerPopupHandlers() {
        $('a.framework-popup').click(function() {
            var url = $(this).data('url');
            TINY.box.show({
                iframe: url,
                boxid: 'frameless',
                width: 750,
                height: 450,
                fixed: false,
                maskopacity: 40
            });
        });
    };
    
    new N.TemplateLoader().load(N.app.templates);

}(Geosite));
