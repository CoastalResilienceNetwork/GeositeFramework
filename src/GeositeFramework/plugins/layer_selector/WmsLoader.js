// Module WmsLoader.js

define(["use!underscore"],
    function (_) {
        dojo.require("esri.layers.wms");

        var WmsLoader = function (url, folderName) {
            var _url = url,
                _folderName = folderName;

            this.load = loadCatalog;

            function loadCatalog(rootNode, layerIdWhitelist, makeContainerNode, makeLeafNode, onLayerSourceLoaded, onLayerSourceLoadError) {
                // Create a WMSLayer object and wait for it to load.
                // (Internally it's doing "GetCapabilities" on the WMS service.)
                var wmsLayer = new esri.layers.WMSLayer(_url);
                dojo.connect(wmsLayer, "onLoad", function () {
                    var folderNode = rootNode;
                    folderNode.wmsLayer = wmsLayer;
                    folderNode.serviceName = folderNode.parent.text + "/" + _folderName;
                    folderNode.hideAllLayers = hideAllLayers;
                    folderNode.setServiceState = setServiceState;
                    folderNode.saveServiceState = saveServiceState;
                    // Make a tree node for each layer exposed by the WMS service, filtered by the specified whitelist
                    _.each(wmsLayer.layerInfos, function (layerInfo, index) {
                        if (!layerIdWhitelist || layerIdWhitelist.length === 0 || _.contains(layerIdWhitelist, layerInfo.name)) {
                            var node = makeLeafNode(layerInfo.title, index, showOrHideLayer, folderNode);
                            node.description = layerInfo.description;
                        }
                    });
                    onLayerSourceLoaded(_url);
                });
                dojo.connect(wmsLayer, "onError", function () {
                    makeContainerNode(_folderName + " (Unavailable)", "folder", rootNode);
                    onLayerSourceLoadError.apply(null, arguments);
                    onLayerSourceLoaded(_url);
                });
            }

            // To show/hide an individual layer we have to specify all visible layers for the service. 
            // So we keep track of the visible layer ids on the folder node.

            function showOrHideLayer(layerNode, shouldShow, map) {
                var folderNode = layerNode.parent,
                    wmsLayer = folderNode.wmsLayer,
                    visibleLayerIds = folderNode.visibleLayerIds;
                if (visibleLayerIds === undefined) {
                    // This is the first event for a layer in this folder
                    wmsLayer.setOpacity(.7);
                    map.addLayer(wmsLayer);
                    visibleLayerIds = [];
                }
                if (shouldShow) {
                    visibleLayerIds = _.union(visibleLayerIds, [layerNode.layerId]);
                } else { // hide
                    visibleLayerIds = _.without(visibleLayerIds, layerNode.layerId);
                }
                wmsLayer.setVisibleLayers(visibleLayerIds);
                folderNode.visibleLayerIds = visibleLayerIds;
            }

            function setServiceState (folderNode, stateObject, map) {
                var myStateObject = stateObject[folderNode.serviceName];

                if (myStateObject) {
                    if (folderNode.visibleLayerIds === undefined) {
                        map.addLayer(folderNode.wmsLayer);
                        folderNode.visibleLayerIds = myStateObject;
                    }
                    folderNode.wmsLayer.setVisibleLayers(myStateObject);
                    folderNode.wmsLayer.setOpacity(.7);
                    folderNode.expanded = true;
                    if (folderNode.parent) {
                        folderNode.parent.expanded = true;
                    }

                    _.each(folderNode.children, function (child) {
                        if (_.contains(myStateObject, child.layerId)) { child.checked = true; }
                    });
                }
            }

            function saveServiceState (folderNode, stateObject) {
                if (folderNode.visibleLayerIds && folderNode.visibleLayerIds !== []) {
                    stateObject[folderNode.serviceName] = folderNode.visibleLayerIds;
                }
            }

            function hideAllLayers(node) {
                node.wmsLayer.setVisibleLayers([]);
            }

        };

        return WmsLoader;
    }
);
