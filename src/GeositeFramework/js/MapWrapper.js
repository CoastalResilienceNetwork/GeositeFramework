/*jslint nomen:true, devel:true */
/*global Geosite, $, _*/

// Wrap an esri.Map object, overriding methods so as to prevent plugins from doing things they shouldn't

(function (N) {
    N.createMapWrapper = function (esriMap) {

        // ------------------------------------------------------------------------
        // Private variables and functions

        var _wrapper = _.extend({}, esriMap),
            _myLayers = [];

        function isMyLayer(layer) {
            return isMyLayerId(layer.id);
        }

        function isMyLayerId(layerId) {
            return _.any(_myLayers, function (l) {
                return l.id === layerId;
            });
        }

        function rememberLayer(layer) {
            if (!isMyLayer(layer)) {
                _myLayers.push(layer);
            }
        }

        function forgetLayer(layer) {
            _myLayers = _.reject(_myLayers, function (l) {
                return l.id === layer.id;
            });
        }

        // ------------------------------------------------------------------------
        // Method overrides

        _wrapper.getLayer = function (layerId) {
            // Get a layer if it's mine
            return (isMyLayerId(layerId) ? esriMap.getLayer(layerId) : null);
        };

        _wrapper.getLayersVisibleAtScaleRange = function (scale) {
            // Get whichever visible layers are mine
            var layers = esriMap.getLayersVisibleAtScaleRange(scale);
            layers = _.filter(layers, isMyLayer);
            return layers;
        };

        _wrapper.addLayer = function (layer, index) {
            // Add layer, and remember it
            esriMap.addLayer(layer, index);
            rememberLayer(layer);
        };

        _wrapper.addLayers = function (layers) {
            // Add layers, and remember them
            esriMap.addLayers(layers);
            _.each(layers, function (layer) {
                rememberLayer(layer);
            });
        };

        _wrapper.removeLayer = function (layer) {
            if (isMyLayer(layer)) {
                // This is my layer; forget it and remove it
                forgetLayer(layer);
                esriMap.removeLayer(layer);
            }
        };

        _wrapper.removeAllLayers = function () {
            // Remove all remembered layers
            _.each(_myLayers, function (layer) {
                esriMap.removeLayer(layer);
            });
            _myLayers = [];
        };

        // ------------------------------------------------------------------------
        // Event overrides

        var _handlers = {

            // Re-raise event if it involves my layers

            onLayerAdd: function (layer) {
                if (isMyLayer(layer)) {
                    _wrapper.onLayerAdd(layer);
                }
            },

            onLayerAddResult: function (layer, error) {
                if (isMyLayer(layer)) {
                    _wrapper.onLayerAddResult(layer, error);
                }
            },

            onLayerReorder: function (layer, index) {
                if (isMyLayer(layer)) {
                    _wrapper.onLayerReorder(layer, index);
                }
            },

            onLayerResume: function (layer) {
                if (isMyLayer(layer)) {
                    _wrapper.onLayerResume(layer);
                }
            },

            onLayerSuspend: function (layer) {
                if (isMyLayer(layer)) {
                    _wrapper.onLayerSuspend(layer);
                }
            },

            onLayersAddResult: function (results) {
                results = _.filter(results, function (result) {
                    return isMyLayer(result.layer);
                });
                if (results.length > 0) {
                    _wrapper.onLayersAddResult(layer);
                }
            },

            onLayersReordered: function (layerIds) {
                layerIds = _.filter(layerIds, function (layerId) {
                    return isMyLayerId(layerId);
                });
                if (layerIds.length > 0) {
                    _wrapper.onLayersReordered(layerIds);
                }
            }

        };

        _.each(_handlers, function (handler, eventName) {
            // Create an empty function for this event, so plugins have something to bind to
            // when they call e.g. dojo.connect(mapWrapper, 'onLayerAdd', ...)
            _wrapper[eventName] = function () { };

            // When this event is raised on the ESRI map object, call our handler
            dojo.connect(esriMap, eventName, handler);
        });

        return _wrapper;
    }

}(Geosite));
