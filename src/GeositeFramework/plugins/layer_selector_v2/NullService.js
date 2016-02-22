define([
        "dojo/_base/declare",
    ],
    function(declare) {
        "use strict";

        return declare(null, {
            getServiceUrl: function() {
                return null;
            },

            // Return a promise containing map service data.
            fetchMapService: function() {
                throw new Error('Not implemented');
            },

            // Return a promise with service layer data.
            fetchLayerDetails: function(tree, layerId) {
                throw new Error('Not implemented');
            },

            // Return cached map service data.
            getServiceData: function() {
                return null;
            },

            // Return cached layer details.
            getLayerDetails: function(serviceLayer) {
                return null;
            },

            // Find the corresponding data for `layer` in the map service.
            findServiceLayer: function(layer) {
                return null;
            },

            findServiceLayerById: function(layerId) {
                return null;
            },

            supportsOpacity: function() {
                return false;
            }
        });
    }
);
