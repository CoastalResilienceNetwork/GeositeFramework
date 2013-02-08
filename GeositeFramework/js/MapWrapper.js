/*jslint nomen:true, devel:true */
/*global Geosite, $, _*/

// Wrap an esri.Map object, overriding methods so as to prevent plugins from doing things they shouldn't

(function (N) {
    N.createMapWrapper = function (esriMap) {
        var _esriMap = esriMap,
            _wrapper = _.extend({}, esriMap),
            _myLayerIds = [];

        function rememberLayer(layerId) {
            if (!_.contains(_myLayerIds, layerId)) {
                _myLayerIds.push(layerId);
            }
        }

        function forgetLayer(layerId) {
            _myLayerIds = _.reject(_myLayerIds, function (id) { return id === layerId; });
        }

        _wrapper.addLayer = function (layer, index) {
            // Add layer, and remember it
            _esriMap.addLayer(layer, index);
            rememberLayer(layer.id);
        };

        _wrapper.addLayers = function (layers) {
            // Add layers, and remember them
            _esriMap.addLayers(layers);
            _.each(layers, function (layer) {
                rememberLayer(layer.id);
            });
        };

        _wrapper.removeLayer = function (layer) {
            if (_.contains(_myLayerIds, layer.id)) {
                // This is my layer; forget it and remove it
                forgetLayer(layer.id);
                _esriMap.removeLayer(layer);
            }
        };

        _wrapper.removeAllLayers = function () {
            // Forget and remove all remembered layers
            _each(_myLayerIds, function (id) {
                forgetLayer(id);
                var layer = _esriMap.getLayer(id);
                if (layer !== undefined) {
                    _esriMap.removeLayer();
                }
            });
        };

        return _wrapper;
    }

}(Geosite));
