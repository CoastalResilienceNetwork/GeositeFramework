/*jslint nomen:true, devel:true */
/*global Geosite, $, _*/

// Wrap an esri.Map object, overriding methods so as to prevent plugins from doing things they shouldn't

(function (N) {
    N.createMapWrapper = function (esriMap, mapModel, pluginObject) {

        // ------------------------------------------------------------------------
        // Private variables and functions

        // Create wrapper object, with esriMap as its prototype
        var mapMaker = function () {};
        mapMaker.prototype = esriMap;
        var _wrapper = new mapMaker(),
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
                if (_.contains(["esri.layers.ArcGISDynamicMapServiceLayer", "esri.layers.ArcGISTiledMapServiceLayer", "esri.layers.WMSLayer"], layer.declaredClass)) {
                    mapModel.addService(layer, pluginObject);
                }
            }
        }

        function forgetLayer(layer) {
            _myLayers = _.reject(_myLayers, function (l) {
                return l.id === layer.id;
            });
            if (_.contains(["esri.layers.ArcGISDynamicMapServiceLayer", "esri.layers.ArcGISTiledMapServiceLayer", "esri.layers.WMSLayer"], layer.declaredClass)) {
                mapModel.removeService(layer);
            }
        }

        // ------------------------------------------------------------------------
        // Method overrides

        _wrapper.getMapId = function() {
            return esriMap.id;
        }

        _wrapper.getLayer = function (layerId) {
            // Get a layer if it's mine
            return (isMyLayerId(layerId) ? esriMap.getLayer(layerId) : undefined);
        };

        _wrapper.getMyLayers = function() {
            return _myLayers;
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

        // Pass along a call to the underlaying setExtent method.  Although
        // this could get called without error because the wrapper prototype
        // object is an esri.map, it only happened to work the first time.  We
        // assume that its reference to an internal extent property was being
        // assigned to the wrong object.  This passthrough works repeatedly
        _wrapper.setExtent = function() {
            esriMap.setExtent.apply(esriMap, arguments);
        };

        // See note above.  MapWrapper map could only call centerAndZoom 2x before
        // it stopped responding calls.
        _wrapper.centerAndZoom = function() {
            esriMap.centerAndZoom.apply(esriMap, arguments);
        };

        // ------------------------------------------------------------------------
        // Event overrides

        var _layerHandlers = {

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
                    _wrapper.onLayersAddResult(results);
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

        _.each(_layerHandlers, function (handler, eventName) {
            // Create an empty function for this event, so plugins have something to bind to
            // when they call e.g. dojo.connect(mapWrapper, 'onLayerAdd', ...)
            _wrapper[eventName] = function () { };

            // When this event is raised on the ESRI map object, call our handler
            dojo.connect(esriMap, eventName, handler);
        });

        // For non-layer events just re-raise

        var _nonLayerEventNames = [
            'onBasemapChange',
            'onClick',
            'onDblClick',
            'onExtentChange',
            'onKeyDown',
            'onKeyUp',
            'onLoad',
            'onMouseDown',
            'onMouseDrag',
            'onMouseDragEnd',
            'onMouseDragStart',
            'onMouseMove',
            'onMouseOut',
            'onMouseOver',
            'onMouseUp',
            'onMouseWheel',
            'onPan',
            'onPanEnd',
            'onPanStart',
            'onReposition',
            'onResize',
            'onTimeExtentChange',
            'onUnload',
            'onUpdateEnd',
            'onUpdateStart',
            'onZoom',
            'onZoomEnd',
            'onZoomStart'
        ];

        _.each(_nonLayerEventNames, function (eventName) {
            // Create an empty function for this event, so plugins have something to bind to
            // when they call e.g. dojo.connect(mapWrapper, 'onClick', ...)
            _wrapper[eventName] = function () { };

            // When this event is raised on the ESRI map object, re-raise
            dojo.connect(esriMap, eventName, function () {
                _wrapper[eventName].apply(null, arguments);
            });
        });

        return _wrapper;
    }

}(Geosite));
