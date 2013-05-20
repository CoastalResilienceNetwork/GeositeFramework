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
            var windowTemplate = N.app.templates['permalink-share-window'],
            currentHref = document.location.href;

            // sometimes location.href will havea  trailing #, sometimes it
            // won't. This makes sure to always append when missing.
            if (currentHref.slice(-1) !== "#") { currentHref += "#"; }

            TINY.box.show({
                html: windowTemplate({ url: currentHref + hash }),
                width: 500,
                height: 200,
                fixed: true,
                openjs: function () {
                    var $domElement = $('.tinner .permalink-textbox');
                    $domElement.select();
                    $domElement.mouseup(
                        function () { $domElement.select(); }
                    );
                }
            });
        },

        setupHashMonitorCallback: function (handleHashChangedFn) {
            // Process the hash once using the handleHashChanged
            // function, then clear it. This is done instead of the
            // typical behavior of HashModels which is to continue
            // listening for changes in the location.hash
            handleHashChangedFn(location.hash);
            location.hash = "";
        }
    };

    function initResizeHandler() {

        function resizeMap() {
            var bottomHeight    = $('.side-nav.bottom').height(),
                sidebarHeight   = $('.sidebar').height();

            $('.side-nav.top').height(sidebarHeight - bottomHeight);
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
