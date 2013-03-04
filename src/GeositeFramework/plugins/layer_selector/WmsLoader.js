// Module WmsLoader.js

define(["jquery", "use!underscore"],
    function ($, _) {
        dojo.require("esri.layers.wms");

        var WmsLoader = function (url, folderName) {
            var _url = url,
                _folderName = folderName;

            this.load = loadCatalog;

            function loadCatalog(rootNode, makeContainerNode, makeLeafNode, onLayerSourceLoaded, onLayerSourceLoadError) {
                // Create a WMSLayer object and wait for it to load.
                // (Internally it's doing "GetCapabilities" on the WMS service.)
                var wmsLayer = new esri.layers.WMSLayer(_url);
                dojo.connect(wmsLayer, "onError", onLayerSourceLoadError);
                dojo.connect(wmsLayer, "onLoad", function () {
                    var folderNode = makeContainerNode(_folderName, "folder", rootNode);
                    folderNode.wmsLayer = wmsLayer;
                    // Make a tree node for each layer exposed by the WMS service
                    _.each(wmsLayer.layerInfos, function (layerInfo, index) {
                        makeLeafNode(layerInfo.title, index, showOrHideLayer, folderNode);
                    });
                    onLayerSourceLoaded(_url);
                });
            }

            // To show/hide an individual layer we have to specify all visible layers for the service. 
            // So we keep track of the visible layer ids on the folder node.

            function showOrHideLayer(layerNode, shouldShow, map) {
                var folderNode = layerNode.parent,
                    wmsLayer = folderNode.wmsLayer,
                    layerIds = folderNode.layerIds;
                if (layerIds === undefined) {
                    // This is the first event for a layer in this folder
                    wmsLayer.setOpacity(.7);
                    map.addLayer(wmsLayer);
                    layerIds = [];
                }
                if (shouldShow) {
                    layerIds = _.union(layerIds, [layerNode.layerId]);
                } else { // hide
                    layerIds = _.without(layerIds, layerNode.layerId);
                }
                wmsLayer.setVisibleLayers(layerIds);
                folderNode.layerIds = layerIds;
            }

        }

        return WmsLoader;
    }
);