(function (N) {
    /*
        The SyncMapManager keeps the extents of any added map views in sync, provided
        that the underlaying map model's 'sync' attribute is set.  To avoid visually 
        appealling, but incorrect, behavior, the manager follows this event sequence:

        mapModel.sync::change -> True
        ... register for map extent changes

        map extent::change
        ...every other map besides the event target
        ......unregister extent listener
        ......register on update end
        ......set extent

        map onupdateed::fired
        ...unregister onupdateend listener
        ...register extent listener
    */
    N.SyncedMapManager = function syncedMapManager() {
        var esriMapListeners = {},
            syncedMapViews = [];

        function registerMapExtentListener(view) {
            // Before registering for this event, make sure all other events
            // have been removed.  This existing event is most likely the onUpdateEnd
            unregisterMapExtentListener(view);
            esriMapListeners[view.cid] =
                dojo.connect(view.esriMap, 'onExtentChange', function (newExtent) {
                    // Get all the synced maps that aren't the ones who've changed
                    var mapViews = _.reject(syncedMapViews, function (syncedMap) {
                        return syncedMap.cid === view.cid
                    });

                    // Update the other maps' extent
                    _.each(mapViews, function (mapView) {
                        unregisterMapExtentListener(mapView);
                        mapView.esriMap.setExtent(newExtent);
                        registerUpdateEndListener(mapView)
                    });
                });
        }

        function unregisterMapExtentListener(view) {
            if (esriMapListeners[view.cid]) {
                dojo.disconnect(esriMapListeners[view.cid]);
                delete esriMapListeners[view.cid];
            }
        }

        function registerUpdateEndListener(view) {
            esriMapListeners[view.cid] = dojo.connect(view.esriMap, 'onUpdateEnd', 
                function() { registerMapExtentListener(view); });
        }

        function toggleMapSync() {
            var mapView = this;
            if (mapView.model.get('sync')) {
                // Register for map extent change event
                registerMapExtentListener(mapView);
            } else {
                // When sync is off, do not listen for map events
                unregisterMapExtentListener(mapView);
            }

        }

        function addMapView(mapView) {
            // Track which maps are meant to be synced
            syncedMapViews.push(mapView);
            mapView.model.on('change:sync', toggleMapSync, mapView);
        };

        return {
            views: syncedMapViews,
            addMapView: addMapView
        };
    }
}(Geosite));