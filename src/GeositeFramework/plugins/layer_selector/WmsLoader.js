// Module WmsLoader.js

define(["use!underscore"],
    function (_) {
        dojo.require("esri.layers.wms");
        var WmsLoader = function (url, folderName, source, extent) {
            var _url = url,
                _folderName = folderName,
                _source = source,
                _extent = extent,
                _makeContainerNode = null,
                _makeLeafNode = null,
                _onLayerSourceLoaded = null,
                _onLayerSourceLoadError = null;

            this.load = loadCatalog;

            function loadCatalog(rootNode, layerConfigs, makeContainerNode, makeLeafNode, onLayerSourceLoaded, onLayerSourceLoadError) {
                _makeContainerNode = makeContainerNode;
                _makeLeafNode = makeLeafNode;
                _onLayerSourceLoaded = onLayerSourceLoaded;
                _onLayerSourceLoadError = onLayerSourceLoadError;

                esri.config.defaults.io.timeout = 30000;
                var layerIdWhitelist = _.pluck(layerConfigs, 'name');
                if (_.has(_source, "resourceInfo")) {
                    if (_source.resourceInfo) {
                        // Layer "resource info" is specified in "layerConfigs"
                        loadCatalogUsingResourceInfo(rootNode, layerConfigs, layerIdWhitelist);
                    } else {
                        // Config file specifies this WMS source should not be loaded
                        var wmsLayer = new esri.layers.WMSLayer(_url);
                        dojo.connect(wmsLayer, "onLoad", function () {});
                        dojo.connect(wmsLayer, "onError", function () {
                            getOrMakeContainerNode(_folderName + " (Unavailable)", rootNode, "service");
                            _onLayerSourceLoadError.apply(null, arguments);
                            _onLayerSourceLoaded(_url);
                        });
                    }
                } else {
                    // Create a WMSLayer object and wait for it to load.
                    // (Internally it's doing "GetCapabilities" on the WMS service.)
                    var wmsLayer = new esri.layers.WMSLayer(_url);
                    dojo.connect(wmsLayer, "onLoad", function () {
                        loadLayers(wmsLayer, rootNode, layerIdWhitelist);
                    });
                    dojo.connect(wmsLayer, "onError", function () {
                        getOrMakeFolderNode(rootNode);
                        _onLayerSourceLoadError.apply(null, arguments);
                        _onLayerSourceLoaded(_url);
                    });
                } 
            }

            function loadCatalogUsingResourceInfo(rootNode, layerConfigs, layerIdWhitelist) {
                var layerInfos = _.map(layerConfigs, function(layerConfig) {
                    var displayName = (_.has(layerConfig, "displayName")) ? layerConfig.displayName : layerConfig.name;
                    var layerExtent = new esri.geometry.Extent({
                        xmin: layerConfig.extent.xmin,
                        ymin: layerConfig.extent.ymin,
                        xmax: layerConfig.extent.xmax,
                        ymax: layerConfig.extent.ymax,
                        spatialReference: { wkid: layerConfig.extent.sr }
                    });
                    return new esri.layers.WMSLayerInfo({
                        name: layerConfig.name,
                        title: displayName,
                        description: layerConfig.description,
                        extent: layerExtent
                    });
                });
                var description = (_.has(_source, "description")) ? _source.description : "";
                var resourceInfo = {
                    extent: _extent,
                    layerInfos: layerInfos,
                    description: description
                };
                var wmsLayer = new esri.layers.WMSLayer(_url, {
                    resourceInfo: resourceInfo,
                    visibleLayers: layerIdWhitelist
                });

                loadLayers(wmsLayer, rootNode, layerIdWhitelist);
                dojo.connect(wmsLayer, "onLoad", function() {
                });
                dojo.connect(wmsLayer, "onError", function(err) {
                    esri.config.defaults.io.timeout = 60000;
                    alert("Error: Unable to load data from this service. Either the service is unavailable or <br> the request can't be completed at the current map scale or browser size.");
                });
            }

            function getOrMakeFolderNode(rootNode) {
                if (_.has(_source, "groupFolder")) {
                    var groupFolder = makeGroupContainerNode(_source, rootNode);
                    if (groupFolder) {
                        return getOrMakeContainerNode(_folderName, groupFolder, "service");
                    }
                }
                return getOrMakeContainerNode(_folderName, rootNode, "service");
            }

            function makeGroupContainerNode(server, parentNode) {
                var node = parentNode;
                if (server.groupFolder != "" ) {
                    var path = server.groupFolder.split("/");
                    //check if containers exist, if not, make them
                    _.each(path, function (name) {
                        node = getOrMakeContainerNode(name, node, "folder");
                    });
                }
                return node;
            }
            
            function getOrMakeContainerNode(name, parentNode, type) {
                var node;
                if ((parentNode.children) && (parentNode.children.length > 0)) {
                    var folder = _.find(parentNode.children, function (child) {
                        return child.text == name;
                    });
                    node = (_.isUndefined(folder)) ? _makeContainerNode(name, type, parentNode) : folder;
                } else {
                    node = _makeContainerNode(name, type, parentNode);
                }
                return node;
            }

            function loadLayers(wmsLayer, rootNode, layerIdWhitelist) {
                var folderNode = getOrMakeFolderNode(rootNode);
                folderNode.wmsLayer = wmsLayer;
                folderNode.serviceName = (folderNode.parent.text) ?  folderNode.parent.text + "/" + _folderName : _folderName;
                folderNode.description = (wmsLayer.description != "") ? wmsLayer.description : "No description or metadata available for this map service.";
                folderNode.opacity = (_.has(_source,"opacity")) ? _source.opacity : 0.7;
                folderNode.extent = new esri.geometry.Extent(wmsLayer.fullExtent);
                folderNode.checked = false;
                folderNode.hideAllLayers = hideAllLayers;
                folderNode.setServiceState = setServiceState;
                folderNode.saveServiceState = saveServiceState;
                folderNode.showOrHideLayer = showOrHideLayer;
                folderNode.setOpacity = setOpacity;
                // Make a tree node for each layer exposed by the WMS service, filtered by the specified whitelist
                _.each(wmsLayer.layerInfos, function (layerInfo, index) {
                    if (!layerIdWhitelist || layerIdWhitelist.length === 0 || _.contains(layerIdWhitelist, layerInfo.name)) {
                        var node = _makeLeafNode(layerInfo.title, index, showOrHideLayer, folderNode);
                        node.description = layerInfo.description;
                        node.extent = new esri.geometry.Extent(layerInfo.extent);
                    }
                    _onLayerSourceLoaded(_url);
                });
            }

            // To show/hide an individual layer we have to specify all visible layers for the service. 
            // So we keep track of the visible layer ids on the folder node.

            function showOrHideLayer(node, shouldShow, map) {
                var layerNode = node.raw;
                var serviceNode = (layerNode.type === "service") ? layerNode : layerNode.parent;
                var wmsLayer = serviceNode.wmsLayer, visibleLayerIds = serviceNode.visibleLayerIds;

                if (visibleLayerIds === undefined) {
                    // This is the first event for a layer in this wms service
                    wmsLayer.setOpacity(serviceNode.opacity);
                    map.addLayer(wmsLayer);
                    visibleLayerIds = [];
                    serviceNode.visibleLayerIds = visibleLayerIds;
                }
                if (layerNode.type === "layer") {
                    if (shouldShow) {
                        visibleLayerIds = _.union(visibleLayerIds, [layerNode.layerId]);
                        layerNode.checked = true;
                    } else { // hide
                        visibleLayerIds = _.without(visibleLayerIds, layerNode.layerId);
                        layerNode.checked = false;
                    }
                    wmsLayer.setVisibleLayers(visibleLayerIds);
                    serviceNode.visibleLayerIds = visibleLayerIds;
                    
                    //check parent nodes if they are unchecked and show wms service layer
                    if ((serviceNode.checked == false) && (node.get('checked'))) {
                        node.parentNode.set('checked', true);
                        serviceNode.checked = true;
                        wmsLayer.show();
                    }
                } else if (layerNode.type === "service") {
                    if (shouldShow) {
                        wmsLayer.show();
                        layerNode.checked = true;
                    } else {
                        wmsLayer.hide();
                        layerNode.checked = false;
                    }
                }
            }

            function setServiceState (folderNode, stateObject, map) {
                var myStateObject = stateObject[folderNode.name];
               
               if (myStateObject) {
                    if (folderNode.visibleLayerIds === undefined) {
                        map.addLayer(folderNode.wmsLayer);
                    }
                    folderNode.visibleLayerIds = myStateObject.visibleLayerIds;
                    folderNode.wmsLayer.setVisibleLayers(myStateObject.visibleLayerIds);
                    folderNode.wmsLayer.setOpacity(myStateObject.opacity);
                    folderNode.checked = myStateObject.checked
                    if (folderNode.checked) {
                        folderNode.expanded = true;
                        if (folderNode.parent) {
                            folderNode.parent.expanded = true;
                        }
                        if (folderNode.parent.parent) {
                            folderNode.parent.parent.expanded = true;
                        }
                    }

                    _.each(folderNode.children, function (child) {
                        if (_.contains(myStateObject.visibleLayerIds, child.layerId)) { child.checked = true; }
                    });
                }
            }

            function saveServiceState (folderNode, stateObject) {
                /*
                 Takes a stateObject passed down from the framework and
                 records the wmsLoader's personal state into it
                 */
                 stateObject[folderNode.name] = {
                    opacity: folderNode.opacity,
                    checked: folderNode.checked
                };   
                if (folderNode.visibleLayerIds && folderNode.visibleLayerIds.length > 0) {
                    stateObject[folderNode.name].visibleLayerIds = folderNode.visibleLayerIds;
                }
            }

            function hideAllLayers(folderNode) {
                folderNode.wmsLayer.setVisibleLayers([]);
                folderNode.visibleLayerIds = [];
            }
            
            function setOpacity(serviceNode, map, opacity) {
                var wmsLayer = serviceNode.wmsLayer;
                wmsLayer.setOpacity(opacity);
                serviceNode.opacity = opacity;
            }

        };

        return WmsLoader;
    }
);
