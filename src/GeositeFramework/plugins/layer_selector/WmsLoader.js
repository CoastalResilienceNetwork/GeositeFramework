// Module WmsLoader.js

define(["use!underscore", "esri/layers/WMSLayer", "esri/layers/WMSLayerInfo"],
    function (_) {
        var WmsLoader = function (url, folderName, config, extent) {
            var _url = url,
                _folderName = folderName,
                _config = config,
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
                if (_.has(_config, "resourceInfo")) {
                    if (_config.resourceInfo) {
                        // Layer "resource info" is specified in "layerConfigs"
                        loadCatalogUsingResourceInfo(rootNode, layerConfigs);
                    } else {
                        // Config file specifies this WMS source should not be loaded
                        var wmsLayer = new WMSLayer(_url);
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
                    var wmsLayer = new WMSLayer(_url);
                    dojo.connect(wmsLayer, "onLoad", function () {
                        loadLayers(wmsLayer, rootNode, layerConfigs);
                    });
                    dojo.connect(wmsLayer, "onError", function () {
                        getOrMakeFolderNode(rootNode);
                        _onLayerSourceLoadError.apply(null, arguments);
                        _onLayerSourceLoaded(_url);
                    });
                }
            }

            function loadCatalogUsingResourceInfo(rootNode, layerConfigs) {
                var layerInfos = _.map(layerConfigs, function(layerConfig) {
                    var displayName = (_.has(layerConfig, "displayName")) ? layerConfig.displayName : layerConfig.name;
                    var layerExtent = new esri.geometry.Extent({
                        xmin: layerConfig.extent.xmin,
                        ymin: layerConfig.extent.ymin,
                        xmax: layerConfig.extent.xmax,
                        ymax: layerConfig.extent.ymax,
                        spatialReference: { wkid: layerConfig.extent.sr }
                    });
                    return new WMSLayerInfo({
                        name: layerConfig.name,
                        title: displayName,
                        description: layerConfig.description,
                        extent: layerExtent
                    });
                });
                var description = (_.has(_config, "description")) ? _config.description : "";
                var resourceInfo = {
                    extent: _extent,
                    layerInfos: layerInfos,
                    description: description
                };
                var wmsLayer = new WMSLayer(_url, {
                    resourceInfo: resourceInfo,
                    visibleLayers: _.pluck(layerConfigs, 'name')
                });

                loadLayers(wmsLayer, rootNode, layerConfigs);
                dojo.connect(wmsLayer, "onLoad", function() {
                });
                dojo.connect(wmsLayer, "onError", function(err) {
                    esri.config.defaults.io.timeout = 60000;
                    alert("Error: Unable to load data from this service. Either the service is unavailable or <br> the request can't be completed at the current map scale or browser size.");
                });
            }

            function getOrMakeFolderNode(rootNode) {
                if (_.has(_config, "groupFolder")) {
                    var groupFolder = makeGroupContainerNode(_config, rootNode);
                    if (groupFolder) {
                        return getOrMakeContainerNode(_folderName, groupFolder, "service", _config);
                    }
                }
                return getOrMakeContainerNode(_folderName, rootNode, "service", _config);
            }

            function makeGroupContainerNode(config, parentNode) {
                var node = parentNode;
                if (config.groupFolder != "" ) {
                    var path = config.groupFolder.split("/");
                    //check if containers exist, if not, make them
                    _.each(path, function (name) {
                        node = getOrMakeContainerNode(name, node, "folder");
                    });
                }
                return node;
            }

            function getOrMakeContainerNode(name, parentNode, type, config) {
                var node;
                if ((parentNode.children) && (parentNode.children.length > 0)) {
                    var folder = _.find(parentNode.children, function (child) {
                        return child.text == name;
                    });
                    node = (_.isUndefined(folder)) ? _makeContainerNode(name, type, parentNode, config) : folder;
                } else {
                    node = _makeContainerNode(name, type, parentNode, config);
                }
                return node;
            }

            function loadLayers(wmsLayer, rootNode, layerConfigs) {
                var folderNode = getOrMakeFolderNode(rootNode);
                folderNode.wmsLayer = wmsLayer;
                folderNode.serviceName = (folderNode.parent.text) ?  folderNode.parent.text + "/" + _folderName : _folderName;
                folderNode.description = (wmsLayer.description != "") ? wmsLayer.description : "No description or metadata available for this map service.";
                folderNode.opacity = (_.has(_config,"opacity")) ? _config.opacity : 0.7;
                folderNode.extent = new esri.geometry.Extent(wmsLayer.fullExtent);
                folderNode.checked = false;
                folderNode.hideAllLayers = hideAllLayers;
                folderNode.setServiceState = setServiceState;
                folderNode.saveServiceState = saveServiceState;
                folderNode.showOrHideLayer = showOrHideLayer;
                folderNode.setOpacity = setOpacity;
                // Make a tree node for each layer exposed by the WMS service, filtered by the specified layerConfigs
                _.each(wmsLayer.layerInfos, function (layerInfo, index) {
                    var layerConfig = {};
                    if (layerConfigs) {
                        layerConfig = _.findWhere(layerConfigs, { name: layerInfo.name });
                    }
                    if (layerConfig) {
                        var node = _makeLeafNode(layerInfo.title, index, showOrHideLayer, folderNode, layerConfig);
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
