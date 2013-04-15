/*jslint nomen:true, devel:true */
/*global Backbone, _, Geosite*/

// Represents the entire app "screen", with attributes for pane layout and map sync.

(function (N) {
    'use strict';

    N.models = N.models || {};
    N.models.Screen = Backbone.Model.extend({
        defaults: {
            mainPaneNumber: 0,
            splitScreen: false,
            showExportButton: false,
            syncMaps: false
        },

        showPane: function switchScreen(mainPaneNumber) {
            this.set({
                'mainPaneNumber': mainPaneNumber,
                'splitScreen': false
            });

            // Force the map to stop syncing when going to a full screen view
            this.toggleMapSync(false);
        },

        split: function splitScreen() {
            // Main screen is always id-0 when in split screen mode
            this.set({
                'mainPaneNumber': 0,
                'splitScreen': true
            });
        },

        toggleMapSync: function (forceSyncTo) {
            // Toggle the value of the sync property, or if forceSyncTo is set, 
            // to the value provided
            var sync = (forceSyncTo === undefined ? !this.get('syncMaps') : forceSyncTo)
            this.set('syncMaps', sync);
        },

        initialize: function () {
            if (N.app.data.region.printServerUrl) {
                this.set('showExportButton', true);
            }
        }
    });

}(Geosite));

(function (N) {
    'use strict';

    var paneSelectors = ["#left-pane", "#right-pane"],
        paneViews = [null, null],
        $body = $('body'),
        bodyClasses = {
            split: 'view-split',
            left: 'view-left',
            right: 'view-right'
        };

    function initialize(view) {
        render(view);
        view.model.on('change', function () { render(view); });
    }

    function render(view) {
        var mainPaneNumber = view.model.get('mainPaneNumber'),
            splitScreen = view.model.get('splitScreen');

        if (splitScreen) {
            setBodyClass(bodyClasses.split);
            ensurePane(0);
            ensurePane(1);
        } else {
            setBodyClass(getBodyClass(mainPaneNumber));
            ensurePane(mainPaneNumber);
        }

        // The maps need to adjust to the new layout size
        $(window).trigger('resize');
    }

    function ensurePane(paneNumber) {
        if (paneViews[paneNumber] === null) {
            // Create pane model
            var pane = new N.models.Pane({
                paneNumber: paneNumber,
                regionData: N.app.data.region
            });

            // Create pane view
            paneViews[paneNumber] = new N.views.Pane({
                model: pane,
                el: $(paneSelectors[paneNumber])
            });
        }
    }

    function getBodyClass(paneNumber) {
        return (paneNumber === 0 ? bodyClasses.left : bodyClasses.right);
    }

    function setBodyClass(newClass) {
        $body.removeClass(_(bodyClasses).values().join(' '))
            .addClass(newClass);
    }

    N.views = N.views || {};
    N.views.Screen = Backbone.View.extend({

        initialize: function (view) { initialize(this); },

        events: {
            'click .switch-screen': 'switchScreen',
            'click .split-screen': function () { this.model.split(); },
            'click .map-sync': function () { this.model.toggleMapSync(); },
            'click .permalink-button': 'makePermalink'
        },

        switchScreen: function switchScreen(event) {
            var screenToShow = $(event.currentTarget).data('screen');
            this.model.showPane(screenToShow);
        },

        makePermalink: function makePermalink() {
            var windowTemplate = N.app.templates['permalink-share-window'];

            _.each(paneViews, function (paneView) {
                if (paneView !== null) {
                    paneView.mapView.saveState();
                }
            });
            Backbone.HashModels.update();

            TINY.box.show({
                html: windowTemplate({ url: window.location.href }),
                width: 500,
                height: 200,
                fixed: true
            });
        },

        printMap: function printMap() {
            var mainPaneNumber = this.model.get('mainPaneNumber'),
                mainPaneView = paneViews[mainPaneNumber],
                esriMap = mainPaneView.mapView.esriMap,
                model = new N.models.ExportTool({ esriMap: esriMap }),
                view = new N.views.ExportTool({ model: model });

            TINY.box.show({
                html: view.render().el,
                width: 450,
                height: 275,
                fixed: true,
                maskopacity:50,
                closejs: function () { view.remove(); }
            });
        }
    });

}(Geosite));
