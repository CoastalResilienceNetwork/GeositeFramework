/*jslint nomen:true, devel:true */
/*global Geosite, $, _*/

// Wrap an esri.Map object, overriding methods so as to prevent plugins from doing things they shouldn't

(function (N) {
    N.createMapWrapper = function (esriMap) {
        var _esriMap = esriMap,
            _wrapper = _.extend({}, esriMap),
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

        _wrapper.getLayer = function (layerId) {
            // Get a layer if it's mine
            return (isMyLayerId(layerId) ? _esriMap.getLayer(layerId) : null);
        };

        _wrapper.getLayersVisibleAtScaleRange = function (scale) {
            // Get whichever visible layers are mine
            var layers = _esriMap.getLayersVisibleAtScaleRange(scale);
            layers = _.filter(layers, isMyLayer);
            return layers;
        };

        _wrapper.addLayer = function (layer, index) {
            // Add layer, and remember it
            _esriMap.addLayer(layer, index);
            rememberLayer(layer);
        };

        _wrapper.addLayers = function (layers) {
            // Add layers, and remember them
            _esriMap.addLayers(layers);
            _.each(layers, function (layer) {
                rememberLayer(layer);
            });
        };

        _wrapper.removeLayer = function (layer) {
            if (isMyLayer(layer)) {
                // This is my layer; forget it and remove it
                forgetLayer(layer);
                _esriMap.removeLayer(layer);
            }
        };

        _wrapper.removeAllLayers = function () {
            // Remove all remembered layers
            _.each(_myLayers, function (layer) {
                _esriMap.removeLayer(layer);
            });
            _myLayers = [];
        };

        return _wrapper;
    }

}(Geosite));
