// Module WmsLoader.js

define(["jquery", "use!underscore"],
    function ($, _) {
        dojo.require("esri.layers.wms");

        var WmsLoader = function (url, folderName, cssClassPrefix) {
            var _url = url,
                _cssClassPrefix = cssClassPrefix,
                _folderName = folderName;

            // Use the catalog data to build a node tree. The node schema targets Ext.data.TreeStore 
            // and Ext.tree.Panel, but should be generic enough for other UI frameworks.

            this.load = loadCatalog;

            function loadCatalog(rootNode, onLoadingComplete, onLoadingError) {
                // Create a WMSLayer object and wait for it to load.
                // (Internally it's doing "GetCapabilities" on the WMS service.)
                var wmsLayer = new esri.layers.WMSLayer(_url);
                dojo.connect(wmsLayer, "onError", onLoadingError);
                dojo.connect(wmsLayer, "onLoad", function () {
                    var folderNode = makeContainerNode(_folderName, "folder", rootNode);
                    folderNode.wmsLayer = wmsLayer;
                    // Make a tree node for each layer exposed by the WMS service
                    _.each(wmsLayer.layerInfos, function (layerInfo, index) {
                        makeLeafNode(layerInfo.title, index, folderNode);
                    });
                    onLoadingComplete(_url);
                });
            }
            
            function makeContainerNode(name, type, parentNode) {
                var node = {
                    type: type,
                    cls: _cssClassPrefix + "-" + type, // When the tree is displayed the node's associated DOM element will have this CSS class
                    text: name.replace(/_/g, " "),
                    leaf: false,
                    children: [],
                    parent: parentNode
                };
                parentNode.children.push(node);
                return node;
            }

            function makeLeafNode(title, layerId, parentNode) {
                var node = {
                    type: "layer",
                    cls: _cssClassPrefix + "-layer", // When the tree is displayed the node's associated DOM element will have this CSS class
                    text: title.replace(/_/g, " "),
                    leaf: true,
                    checked: false,
                    layerId: layerId,
                    parent: parentNode,
                    showOrHideLayer: showOrHideLayer
                };
                parentNode.children.push(node);
                return node;
            }

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