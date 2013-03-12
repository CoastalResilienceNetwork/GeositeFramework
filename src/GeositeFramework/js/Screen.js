/*jslint nomen:true, devel:true */
/*global Backbone, _, Geosite*/

// Represents the entire app "screen", with attributes for pane layout and map sync.

(function (N) {
    'use strict';

    N.models = N.models || {};
    N.models.Screen = Backbone.Model.extend({
        defaults: {
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
