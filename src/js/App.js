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
        dispatcher: _.clone(Backbone.Events),

        init: function initializeApp(version, regionData, pluginClasses) {
            var self = this;
            N.app.version = version;
            N.app.data.region = regionData;
            N.plugins = pluginClasses;

            N.defaults = {
                identifyEnabled: regionData.identifyEnabled
            };

            N.app.loadedWithState = false;
            if (location.hash !== '' && location.hash !== '#') {
                N.app.loadedWithState = true;
            }

            N.app.singlePluginMode = false;
            if (regionData.singlePluginMode) {
                N.app.singlePluginMode = regionData.singlePluginMode.active;
            }

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

            // Unless a saved state has specifically been added to set split screen to
            // true, set it to false to trigger hashmodels to pick up the changed
            // attribute.  This will encode the value of split screen in the state when
            // executed, with the side effect that Scenarios from launchpad will include
            // whether or not split screen should be active.  Can't be put in init since
            // has to be after addModel above.
            if (!N.app.models.screen.get('splitScreen')) {
                N.app.models.screen.set('splitScreen', false);
            }

            N.app.dispatcher.on('launchpad:activate-scenario', function(state) {
                var forceHashChange = true;
                self.hashModels.triggerStateChange(state, forceHashChange);
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

            internationalize(N.app.data.region.language);
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
        },

        // Revert identify setting back to region default value.
        restoreIdentify: function() {
            N.app.data.region.identifyEnabled = N.defaults.identifyEnabled;
        },

        // Temporarily suspend identify handler.
        suspendIdentify: function() {
            N.app.data.region.identifyEnabled = false;
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
                width: 600,
                iframe: url,
                boxid: 'frameless',
                fixed: false,
                maskopacity: 40,
                openjs: function() {
                    // Insert a header after iframe is open to get the look
                    // to match other popups
                    var headerHtml = '<div class="popover-header"></div>';
                    $('#'+this.boxid).prepend(headerHtml);
                },
                closejs: function() {
                    $('#'+this.boxid).find('.popover-header').remove();
                }
            });

        });
    };

    function internationalize(lng) {
        var options = {
                // The language to internationalize for
                lng: lng,
                // No fallback language necessary since we fallback to keyphrases
                fallbackLng: false,
                // Following two required for using gettext() style keyphrases
                keySeparator: false,
                nsSeparator: false,
                // Allows the use of sprintf arguments in the main .t() function,
                // e.g. i18next.t('Longitude %f, Latitude %f', lng, lat)
                overloadTranslationOptionHandler: i18nextSprintfPostProcessor.overloadTranslationOptionHandler,
                // Path to load translations from
                backend: {
                    loadPath: 'languages/{{lng}}'
                }
            },
            callback = function() {
                // Once i18next is initialized, initialize the jQuery plugin
                // which allows the use of data-i18n attributes
                i18nextJquery.init(i18next, $);

                // Internationalize everything tagged with .i18n by replacing
                // its contents with that of the data-i18n attribute
                $('.i18n').localize();
            };

        i18next.use(i18nextXHRBackend).use(i18nextSprintfPostProcessor).init(options, callback);
    }

    new N.TemplateLoader().load(N.app.templates);

}(Geosite));
