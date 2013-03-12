/*jslint nomen:true, devel:true */
/*global Backbone, _, Geosite*/

// Represents the entire app "screen", with attributes for pane layout and map sync.

(function (N) {
    'use strict';

    N.models = N.models || {};
    N.models.Screen = Backbone.Model.extend({
        defaults: {
            id: 'screen', // for saving state with backbone.hashmodels
            mainPaneNumber: 0,
            splitView: false,
            syncMaps: false
        },

        showPane: function switchScreen(mainPaneNumber) {
            this.set({
                'mainPaneNumber': mainPaneNumber,
                'splitView': false
            });

            // Force the map to stop syncing when going to a full screen view
            this.toggleMapSync(false);
        },

        split: function splitScreen() {
            // Main screen is always id-0 when in split screen mode
            this.set({
                'mainPaneNumber': 0,
                'splitView': true
            });
        },

        toggleMapSync: function (forceSyncTo) {
            // Toggle the value of the sync property, or if forceSyncTo is set, 
            // to the value provided
            var sync = (forceSyncTo === undefined ? !this.get('syncMaps') : forceSyncTo)
            this.set('syncMaps', sync);
        }
    });

}(Geosite));

(function (N) {
    'use strict';

    function initialize(view) {
    }

    function render(view) {
    }

    var $body = $('body'),
        bodyClass = {
            split: 'view-split',
            left: 'view-left',
            right: 'view-right'
        };

    function adjustPanes(newClass) {
        // If only the first pane has been created, create the right-pane (id-1)
        if (N.app.models.panes.length < 2) {
            setBodyClass(bodyClass.right);
            N.app.createPane(1);
        }

        setBodyClass(newClass);

        // The maps need to adjust to the new layout size
        $(window).trigger('resize');
    }

    function setBodyClass(newClass) {
        $body.removeClass(_(bodyClass).values().join(' '))
            .addClass(newClass);
    }

    N.views = N.views || {};
    N.views.Screen = Backbone.View.extend({

        initialize: function (view) { initialize(this); },

        events: {
            'click .switch-screen': 'switchScreen',
            'click .split-screen': 'splitScreen',
            'click .map-sync': function () { this.model.toggleMapSync(); },
            'click .permalink-button': 'makePermalink'
        },

        switchScreen: function switchScreen(evt) {
            var screenToShow = $(evt.currentTarget).data('screen'),
                 newClass = (screenToShow === 0 ? bodyClass.left : bodyClass.right);
            adjustPanes(newClass);
            this.model.showPane(screenToShow);
        },

        splitScreen: function splitScreen() {
            // Align the body classes to be in split-screen mode
            adjustPanes(bodyClass.split);
            this.model.split();
        },

        makePermalink: function makePermalink() {
            Backbone.HashModels.update();
        }


    });

}(Geosite));
