/*jslint nomen:true, devel:true */
/*global Backbone, _, Geosite, $ */

// Represents the entire app "screen", with attributes for pane layout and map sync.

(function (N) {
    'use strict';

    N.models = N.models || {};
    N.models.Screen = Backbone.Model.extend({
        defaults: {
            helpUrl: null,
            mainPaneNumber: 0,
            splitScreen: null,
            showExportButton: false,
            syncMaps: false
        },

        showPane: function (mainPaneNumber) {
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
            var sync = (forceSyncTo === undefined ? !this.get('syncMaps') : forceSyncTo);
            this.set('syncMaps', sync);
        },

        initialize: function () { }
    });

}(Geosite));

(function (N) {
    'use strict';

    var paneSelectors = ["#left-pane"],
        paneViews = [null],
        $body = $('body'),
        bodyClasses = {
            split: 'view-split',
            left: 'view-left',
            right: 'view-right'
        };

    function initialize(view) {
        render(view);
        view.model.on(
            'change:splitScreen change:syncMaps change:mainPaneNumber',
            function () { render(view); });
        N.app.dispatcher.on('save-share', function() {
            view.makePermalink();
        });
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

            N.app.hashModels.addModel(pane, {
                id: 'pane' + pane.get('paneNumber').toString(),
                attributes: ['paneNumber', 'stateOfPlugins', 'activeSubregion']
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
            $(N).trigger('resize');
        },

        makePermalink: function makePermalink() {
            _.each(paneViews, function (paneView) {
                if (paneView !== null && paneView.saveState) {
                    paneView.saveState();
                }
            });
            Backbone.HashModels.update();
        }
    });

}(Geosite));
