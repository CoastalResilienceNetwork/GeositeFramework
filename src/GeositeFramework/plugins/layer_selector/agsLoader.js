// Module AgsLoader.js

define(["jquery",
        "use!underscore",
        "esri/layers/FeatureLayer",
        "esri/layers/ArcGISDynamicMapServiceLayer",
        "esri/layers/ArcGISTiledMapServiceLayer",
        "esri/geometry/Extent",
        "dojo/DeferredList"],
    function ($, _,
              FeatureLayer,
              ArcGISDynamicMapServiceLayer,
              ArcGISTiledMapServiceLayer,
              Extent,
              DeferredList) {
        var AgsLoader = function(baseUrl) {
            var _baseUrl = baseUrl,
                _folderConfigs = null,
                _makeContainerNode = null,
                _makeLeafNode = null,
                _onLayerSourceLoaded = null,
                _onLayerSourceLoadError = null,
                _currentStateCodeVersion = '1.1';

            // Load hierarchy of folders, services, and layers from an ArcGIS Server via its REST API.
            // The catalog root contains folders and/or services.
            // Each folder contains additional services.
            // Each "MapServer" service exposes a number of layers.
            // A layer entry may actually be a group, containing other layers in the same collection.

            this.load = loadCatalog;

            function loadCatalog(rootNode, folderConfigs, makeContainerNode, makeLeafNode, onLayerSourceLoaded, onLayerSourceLoadError) {
                // Load root catalog entries
                _folderConfigs = folderConfigs;
                _makeContainerNode = makeContainerNode;
                _makeLeafNode = makeLeafNode;
                _onLayerSourceLoaded = onLayerSourceLoaded;
                _onLayerSourceLoadError = onLayerSourceLoadError;

                loadFolders(_folderConfigs, rootNode);
            }

            function loadFolders(folderConfigs, parentNode) {
                // Start loading all folders, keeping "deferred" objects so we know when they're done
                var folderDeferreds = _.map(folderConfigs, function(folderConfig) {
                    var folderName = folderConfig.name,
                        url = (_.has(folderConfig, "url")) ? folderConfig.url : _baseUrl,
                        requestUrl = url + (folderName === "" ? "" : "/" + folderName),
                        result = {
                            folderConfig: folderConfig,
                            url: url,
                            node: parentNode
                        };
                    return esri.request({
                        url: requestUrl,
                        content: { f: "json" },
                        handleAs: "json",
                        callbackParamName: "callback",
                        timeout: 7000
                    }).then(function(results) {
                        return _.extend(result, { success: true, results: results });
                    }, function(error) {
                        return _.extend(result, { success: false, results: error });
                    });
                });

                new DeferredList(folderDeferreds).then(function(data) {
                    var serviceSpecs = _.map(data, function(result) {
                        var item = result[1];
                        if (item.success) {
                            return processFolderSuccess(item.results, item.folderConfig, item.url, item.node);
                        } else {
                            return processFolderError(item.results, item.folderConfig, item.url, item.node);
                        }
                    });
                    serviceSpecs = _.flatten(serviceSpecs, true);
                    loadServices(serviceSpecs);
                });
            }

            function processFolderSuccess(entries, folderConfig, url, parentNode) {
                var node,
                    folderName = folderConfig.name;
                if (_.has(folderConfig, "groupFolder")) {
                    if ((_.has(folderConfig, "groupAsService")) && (folderConfig.groupAsService)) {
                        node = makeGroupContainerNode(folderConfig, parentNode.parent, "service");
                        node.checked = false;
                        node.type = "group-service";
                        node.description = folderConfig.description || "No description or metadata available for this map service.";
                        node.groupAsService = true;
                    } else {
                        node = makeGroupContainerNode(folderConfig, parentNode.parent, "folder");
                    }
                } else {
                    node = getOrMakeFolderNode(folderConfig, folderName, parentNode);
                }

                var serviceSpecs;
                if (folderConfig.services && folderConfig.services.length > 0) {
                    serviceSpecs = _.map(folderConfig.services, function (serviceConfig) {
                        var serviceSpec = _.find(entries.services, function (serviceSpec) {
                            return getServiceName(serviceSpec.name) == serviceConfig.name;
                        });
                        if (_.isUndefined(serviceSpec)) {
                            serviceSpec = processServiceError(serviceConfig, folderName, node, url, "Map service unavailable or invalid url");
                        } else {
                            serviceSpec.config = serviceConfig;
                        }
                        return serviceSpec;
                    });
                } else {
                    serviceSpecs = entries.services;
                }

                _.each(serviceSpecs, function (serviceSpec) {
                    var folder = serviceSpec.name.split("/")[0],
                        cleanUrl = url.split("/" + folder)[0];
                    serviceSpec.url = cleanUrl;
                    serviceSpec.parentNode = node;
                });

                return serviceSpecs;
            }

            function processFolderError(error, folderConfig, url, parentNode) {
                var node,
                    folderName = folderConfig.name;
                if (_.has(folderConfig, "groupFolder")) {
                    node = makeGroupContainerNode(folderConfig, parentNode.parent, "folder");
                } else {
                    node = getOrMakeFolderNode(folderConfig, folderName, parentNode);
                }
                var services = _.map(folderConfig.services, function (serviceConfig) {
                    var item = processServiceError(serviceConfig, folderName, node, url, error.message);
                    return item;
                });
                return services;
            }

            function getOrMakeFolderNode(folderConfig, folderName, parentNode) {
                var displayName = folderConfig.displayName || folderName;
                return (folderName == "") ? parentNode : getOrMakeContainerNode(displayName, parentNode, "folder", folderConfig);
            }

            function makeGroupContainerNode(config, parentNode, type) {
                var node = parentNode;
                if ((config.groupFolder) && (config.groupFolder != "")) {
                    var path = config.groupFolder.split("/");
                    //check if containers exist, if not, make them
                    _.each(path, function (name) {
                        node = getOrMakeContainerNode(name, node, type);
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

            function processServiceError(serviceConfig, folderName, node, url, error) {
                return {
                    config: serviceConfig,
                    name: (folderName === "") ? serviceConfig.name : folderName + "/" + serviceConfig.name,
                    type: "MapServer",
                    parentNode: node,
                    url: url,
                    error: "Error: Failed to load map service (" + error + ")."
                };
            }

            function loadServices(serviceSpecs) {
                // Each item in "serviceSpecs" contains info for a service, including:
                //   - the "url" to query for further info, or "error" if no further info is available
                //   - "config" info from the "layers.json" file
                //   - "parentNode" so we can attach it to the node tree
                // The specs retain their original order from the "layers.json" file, which allows us to
                // create nodes in the correct order.

                var serviceDeferreds = _.map(serviceSpecs, function(serviceSpec) {
                    if (serviceSpec.error) {
                        // Include errors so results stay in order. Wrap in a deferred object for homogeneity.
                        return makeDeferredError(serviceSpec.error);
                    } else if (serviceSpec.type === "MapServer") {
                        return esri.request({
                            url: serviceSpec.url + "/" + serviceSpec.name + "/MapServer",
                            content: { f: "json" },
                            handleAs: "json",
                            callbackParamName: "callback",
                            timeout: 7000
                        }).then(_.identity,
                            function(error) {
                                return makeError("Error: Failed to load map service (" + error.message + ").");
                            });
                    } else {
                        return makeDeferredError("Only 'MapServer' services are supported");
                    }

                    function makeDeferredError(message) {
                        var deferred = new dojo.Deferred(_.identity);
                        deferred.resolve(makeError(message));
                        return deferred;
                    }

                    function makeError(message) {
                        return { error: message };
                    }
                });

                new DeferredList(serviceDeferreds).then(function(results) {
                    _.each(results, function(result, i) {
                        var serviceData = result[1],
                            serviceSpec = serviceSpecs[i];
                        loadService(serviceSpec, serviceData);
                    });
                });
            }

            function loadService(serviceSpec, serviceData) {
                var serviceName = getServiceName(serviceSpec.name),
                    serviceConfig = serviceSpec.config,
                    serviceUrl = serviceSpec.url + "/" + serviceSpec.name + "/MapServer";

                var node = _makeContainerNode(serviceName, "service", serviceSpec.parentNode, serviceConfig);
                node.text = (_.has(serviceConfig, "displayName")) ? serviceConfig.displayName : node.text;
                node.serviceName = serviceSpec.name;
                if (_.has(serviceData, "error")) {
                    node.text = node.text + " (Unavailable)";
                    node.description = serviceData.error;
                    node.url = serviceUrl;
                    delete node.children;
                    node.leaf = true;
                    if (_.has(node.parent, "groupAsService")) {
                        node.cls = "pluginLayerSelector-layer";
                    }
                } else {
                    node.description = serviceConfig.description || serviceData.description || serviceData.serviceDescription || "No description or metadata available for this map service.";
                    node.opacity = (_.has(serviceConfig, "opacity")) ? serviceConfig.opacity : 0.7;
                    node.params = { "opacity": node.opacity };
                    node.extent = new Extent(serviceData.fullExtent);
                    node.checked = false;
                    node.serviceType = serviceConfig.type;
                    node.setOpacity = setOpacity;
                    node.hideAllLayers = hideAllLayers;
                    node.saveServiceState = saveServiceState;
                    node.setServiceState = setServiceState;
                    node.showOrHideLayer = showOrHideLayer;

                    if (node.serviceType === "dynamic") {
                        loadDynamicService(node, serviceConfig, serviceData, serviceUrl);
                    } else if (node.serviceType === "tiled") {
                        loadTiledService(node, serviceConfig, serviceUrl);
                    } else if (node.serviceType === "feature-layer") {
                        loadFeatureLayerService(node, serviceConfig, serviceUrl);
                    }
                    if (_.has(serviceConfig, "id")) {
                        node.params.id = serviceConfig.id;
                    }
                    if (_.has(node.parent, "groupAsService")) {
                        node.cls = "pluginLayerSelector-layer";
                        delete node.setOpacity;
                        node.parent.setOpacity = setOpacity;
                        node.parent.opacity = node.opacity;
                        node.parent.saveServiceState = saveServiceState;
                        node.parent.setServiceState = setServiceState;
                        node.parent.showOrHideLayer = showOrHideLayer;
                    }
                }

                var url = serviceUrl.split("/");
                url.pop();
                _onLayerSourceLoaded(url.join("/"));
            }

            function getServiceName(name) {
                // "Alabama/Bathymetry" => "Bathymetry"
                return (name.indexOf('/') == -1 ? name : name.split('/')[1]);
            }

            function loadDynamicService(node, serviceConfig, serviceData, serviceUrl) {
                node.url = serviceUrl;

                var dataLayers = serviceData.layers;

                if (_.has(serviceConfig, "layerMetadata")) {
                    dataLayers = mergeLayerMetadata(dataLayers, serviceConfig.layerMetadata);
                }
                if (_.has(serviceConfig, "showLayers")) {
                    if (serviceConfig.showLayers.length > 0) {
                        var layers = _.map(serviceConfig.showLayers, function (layerConfig) {
                            var item = _.find(dataLayers, function (layer) {
                                if (layer.id == layerConfig.id) {
                                    return layer;
                                }
                            });
                            var layer = _.clone(item);
                            if (_.has(layerConfig, "parentLayerId")) {
                                layer.parentLayerId = layerConfig.parentLayerId;
                            }
                            if (_.has(layerConfig, "displayName")) {
                                layer.name = layerConfig.displayName;
                            }
                            if (_.has(layerConfig, "downloadUrl")) {
                                layer.downloadUrl = layerConfig.downloadUrl;
                            }
							if (_.has(layerConfig, "visibleSubLayerIds")) {
                                layer.visibleSubLayerIds = layerConfig.visibleSubLayerIds;
                            }
                            return layer;
                        });
                        loadLayers(layers, node);
                    } else {
                        delete node.children;
                        node.leaf = true;
                        if (_.has(serviceConfig, "visibleLayerIds")) {
                            node.visibleLayerIds = serviceConfig.visibleLayerIds;
                        }
                    }
                } else {
                    loadLayers(dataLayers, node);
                }
            }

            function loadLayers(layerSpecs, serviceNode) {
                var layerNodes = {};
                _.each(layerSpecs, function (layerSpec) {
                    // A layer might specify a parent layer; otherwise it hangs off the service
                    var parentNode = (layerSpec.parentLayerId === -1 ? serviceNode : layerNodes[layerSpec.parentLayerId]);
                    if (layerSpec.subLayerIds === null || _.has(layerSpec,"visibleSubLayerIds")) {
                        // This is an actual layer or has visibleSubLayerIds and should be treated as an actual layer
                        var node = _makeLeafNode(layerSpec.name, layerSpec.id, showOrHideLayer, parentNode, layerSpec);
                        node.fetchMetadata = fetchMetadata;
                    } else {
                        // This is a layer group
						layerNodes[layerSpec.id] = _makeContainerNode(layerSpec.name, "layer-group", parentNode);
						layerNodes[layerSpec.id].checked = false;
						layerNodes[layerSpec.id].showOrHideLayer = showOrHideLayer;
						layerNodes[layerSpec.id].layerId = layerSpec.id;
						layerNodes[layerSpec.id].fetchMetadata = fetchMetadata;
                    }
                }, this);
            }

            function loadTiledService(node, serviceConfig, serviceUrl) {
                node.url = serviceUrl;
                delete node.children;
                node.leaf = true;
                if (_.has(serviceConfig, "displayLevels")) {
                    node.params.displayLevels = serviceConfig.displayLevels;
                }
            }

            function loadFeatureLayerService(node, serviceConfig, serviceUrl) {
                node.url = serviceUrl + "/" + serviceConfig.layerIndex;
                delete node.children;
                node.leaf = true;
                if (_.has(serviceConfig, "mode")) {
                    var modes = {
                        "snapshot": FeatureLayer.MODE_SNAPSHOT,
                        "ondemand": FeatureLayer.MODE_ONDEMAND,
                        "selection": FeatureLayer.MODE_SELECTION
                    };
                    var mode = modes[serviceConfig.mode];
                    node.params.mode = mode;
                }
                if (_.has(serviceConfig, "symbology")) {
                    var symbol = getLayerSymbology(serviceConfig.symbology);
                    node.symbology = symbol;
                }
                if (_.has(serviceConfig, "outFields")) {
                    node.params.outFields = serviceConfig.outFields;
                }
                if (_.has(serviceConfig, "autoGeneralize")) {
                    node.params.autoGeneralize = serviceConfig.autoGeneralize;
                }
                if (_.has(serviceConfig, "displayOnPan")) {
                    node.params.displayOnPan = serviceConfig.displayOnPan;
                }
                if (_.has(serviceConfig, "layerDefinition")) {
                    node.layerDefinition = serviceConfig.layerDefinition;
                }
            }

            function getLayerSymbology(symbology) {
                var symbol, symbols, styles;
                if (_.has(symbology, "fill")) {
                    symbols = {
                        "simple": new esri.symbol.SimpleFillSymbol(),
                        "picture": new esri.symbol.PictureFillSymbol()
                    };
                    styles = {
                        "solid": esri.symbol.SimpleLineSymbol.STYLE_SOLID,
                        "horizontal": esri.symbol.SimpleLineSymbol.STYLE_HORIZONTAL,
                        "vertical": esri.symbol.SimpleLineSymbol.STYLE_VERTICAL,
                        "forward_diagonal": esri.symbol.SimpleLineSymbol.STYLE_FORWARD_DIAGONAL,
                        "backward_diagonal": esri.symbol.SimpleLineSymbol.STYLE_BACKWARD_DIAGONAL,
                        "cross": esri.symbol.SimpleLineSymbol.STYLE_CROSS,
                        "diagonal_cross": esri.symbol.SimpleLineSymbol.STYLE_DIAGONAL_CROSS,
                        "null": esri.symbol.SimpleLineSymbol.STYLE_NULL
                    };
                    symbol = symbols[symbology.fill.type];
                    if (_.has(symbology.fill, "style")) {
                        symbol.setStyle(styles[symbology.fill.style]);
                    }
                    if (_.has(symbology.fill, "color")) {
                        symbol.setColor(new dojo.Color(symbology.fill.color));
                    }
                    if (_.has(symbology.fill, "outline")) {
                        symbol.setOutline(createLineSymbol(symbology.fill.outline));
                    }
                    if (symbology.fill.type == "picture") {
                        if (_.has(symbology.fill, "url")) {
                            symbol.setUrl(symbology.fill.url);
                        }
                        if (_.has(symbology.fill, "width")) {
                            symbol.setWidth(symbology.fill.width);
                        }
                        if (_.has(symbology.fill, "height")) {
                            symbol.setHeight(symbology.fill.height);
                        }
                        if (_.has(symbology.fill, "offset")) {
                            symbol.setOffset(symbology.fill.offset.x, symbology.fill.offset.y);
                        }
                        if (_.has(symbology.fill, "xscale")) {
                            symbol.setXScale(symbology.fill.xscale);
                        }
                        if (_.has(symbology.fill, "yscale")) {
                            symbol.setXScale(symbology.fill.yscale);
                        }
                    }
                }
                if (_.has(symbology, "line")) {
                    symbol = createLineSymbol(symbology.line);
                }
                if (_.has(symbology, "marker")) {
                    symbols = {
                        "simple": new esri.symbol.SimpleMarkerSymbol(),
                        "picture": new esri.symbol.PictureMarkerSymbol()
                    };
                    styles = {
                        "circle": esri.symbol.SimpleLineSymbol.STYLE_CIRCLE,
                        "square": esri.symbol.SimpleLineSymbol.STYLE_SQUARE,
                        "cross": esri.symbol.SimpleLineSymbol.STYLE_CROSS,
                        "x": esri.symbol.SimpleLineSymbol.STYLE_X,
                        "diamond": esri.symbol.SimpleLineSymbol.STYLE_DIAMOND,
                        "path": esri.symbol.SimpleLineSymbol.STYLE_PATH
                    };
                    symbol = symbols[symbology.marker.type];
                    if (_.has(symbology.marker, "style")) {
                        symbol.setStyle(styles[symbology.marker.style]);
                    }
                    if (_.has(symbology.marker, "color")) {
                        symbol.setColor(new dojo.Color(symbology.marker.color));
                    }
                    if (_.has(symbology.marker, "size")) {
                        symbol.setSize(symbology.marker.size);
                    }
                    if (_.has(symbology.marker, "angle")) {
                        symbol.setAngle(symbology.marker.angle);
                    }
                    if (_.has(symbology.marker, "offset")) {
                        symbol.setOffset(symbology.marker.offset.x, symbology.marker.offset.y);
                    }
                    if (symbology.marker.type == "simple") {
                        if (_.has(symbology.marker, "outline")) {
                            symbol.setOutline(createLineSymbol(symbology.marker.outline));
                        }
                    } else if (symbology.marker.type == "picture") {
                        if (_.has(symbology.marker, "url")) {
                            symbol.setUrl(symbology.marker.url);
                        }
                        if (_.has(symbology.marker, "width")) {
                            symbol.setWidth(symbology.marker.width);
                        }
                        if (_.has(symbology.marker, "height")) {
                            symbol.setHeight(symbology.marker.height);
                        }
                    }
                }
                return symbol;
            }

            function createLineSymbol(line) {
                var symbols = {
                    "simple": new esri.symbol.SimpleLineSymbol(),
                    "cartographic": new esri.symbol.CartographicLineSymbol()
                };
                var styles = {
                    "solid": esri.symbol.SimpleLineSymbol.STYLE_SOLID,
                    "dash": esri.symbol.SimpleLineSymbol.STYLE_DASH,
                    "dot": esri.symbol.SimpleLineSymbol.STYLE_DOT,
                    "dashdot": esri.symbol.SimpleLineSymbol.STYLE_DASHDOT,
                    "dashdotdot": esri.symbol.SimpleLineSymbol.STYLE_DASHDOTDOT,
                    "shortdash": esri.symbol.SimpleLineSymbol.STYLE_SHORTDASH,
                    "shortdot": esri.symbol.SimpleLineSymbol.STYLE_SHORTDOT,
                    "shortdashdotdot": esri.symbol.SimpleLineSymbol.STYLE_SHORTDASHDOTDOT,
                    "shortdashdot": esri.symbol.SimpleLineSymbol.STYLE_SHORTDASHDOT,
                    "longdash": esri.symbol.SimpleLineSymbol.STYLE_LONGDASH,
                    "longdashdot": esri.symbol.SimpleLineSymbol.STYLE_LONGDASHDOT,
                    "null": esri.symbol.SimpleLineSymbol.STYLE_NULL
                };
                var caps = {
                    "butt": esri.symbol.SimpleLineSymbol.CAP_BUTT,
                    "round": esri.symbol.SimpleLineSymbol.CAP_ROUND,
                    "square": esri.symbol.SimpleLineSymbol.CAP_SQUARE
                };
                var miters = {
                    "miter": esri.symbol.SimpleLineSymbol.JOIN_MITER,
                    "round": esri.symbol.SimpleLineSymbol.JOIN_ROUND,
                    "bevel": esri.symbol.SimpleLineSymbol.JOIN_BEVEL
                };
                var symbol = symbols[line.type];
                if (_.has(line, "style")) {
                    symbol.setStyle(styles[line.style]);
                }
                if (_.has(line, "color")) {
                    symbol.setColor(new dojo.Color(line.color));
                }
                if (_.has(line, "width")) {
                    symbol.setWidth(line.width);
                }
                if (symbol == "cartographic") {
                    if (_.has(line, "cap")) {
                        symbol.setCap(caps[line.cap]);
                    }
                    if (_.has(line, "miter")) {
                        symbol.setJoin(miters[line.miter]);
                    }
                    if (_.has(line, "miterLimit")) {
                        symbol.setMiterLimit(line.miterLimit);
                    }
                }
                return symbol;
            }

            function hideAllLayers(serviceNode, map) {
                if (serviceNode.esriService) {
                    if (serviceNode.serviceType === "dynamic") {
                        serviceNode.esriService.setVisibleLayers([-1]);
                    } else if ((serviceNode.serviceType === "tiled") || (serviceNode.serviceType === "feature-layer")) {
                        serviceNode.esriService.hide();
                    }
                }
            }

            // Service nodes can be added multiple times to a layer config, but with different
            // children activated.  Create a unique key for a service+children combo so the
            // state keys won't overwrite each other.  However, existing permalinks would break
            // if they don't contain the hash based on child ids, so this function makes the
            // decision on key name based on the presence of a version code embedded in the state.
            // If no state is provided, it assumes you're generating a new code and will use
            // the current version.
            function getServiceUniqueKey(serviceNode, stateObject) {
                var childIds = _.pluck(serviceNode.children, 'layerId').join(''),
                    comboKey = serviceNode.name + childIds;

                if (stateObject && stateObject.version) {
                    // State was passed in with a version
                    if (stateObject.version === '1.1') {
                        return comboKey;
                    }
                } else if (stateObject) {
                    // State was passed in, but without a version.
                    // Assume code predates versioning and give "original", just name
                    return serviceNode.name;
                }
                // State was not passed in, or the version was not 1.1 - use the new key
                return comboKey;

            }

            function setServiceState(serviceNode, stateObject, map) {
                var key = getServiceUniqueKey(serviceNode, stateObject),
                    myStateObject = stateObject[key], esriService;

                if (myStateObject) {
                    serviceNode.opacity = myStateObject.opacity;
                    serviceNode.checked = myStateObject.checked;
                    if (serviceNode.checked) {
                        serviceNode.expanded = true;
                        serviceNode.parent.expanded = true;
                        if (serviceNode.parent.parent) {
                            serviceNode.parent.parent.expanded = true;
                        }
                        if (serviceNode.type != "group-service") {
                            esriService = getServiceObject(serviceNode, map);
                            if (serviceNode.serviceType === "dynamic") {
                                if (myStateObject.visibleLayerIds) {
                                    serviceNode.visibleLayerIds = myStateObject.visibleLayerIds;
                                    esriService.setVisibleLayers(myStateObject.visibleLayerIds);
                                }
                                _.each(serviceNode.children, function(child) {
                                    if (_.contains(myStateObject.visibleLayerIds, child.layerId)) {
                                        child.checked = true;
                                    }
                                });
                            } else if ((serviceNode.serviceType === "tiled") || (serviceNode.serviceType === "feature-layer")) {
                                esriService.show();
                            }
                        } else if (serviceNode.type === "group-service") {
                            if (myStateObject.visibleServices) {
                                _.each(myStateObject.visibleServices, function(visible, i) {
                                    serviceNode.children[i].checked = visible;
                                    if ((visible) && (serviceNode.checked)) {
                                        esriService = getServiceObject(serviceNode.children[i], map);
                                        esriService.show();
                                    }
                                });
                            }
                        }
                    }
                }
            }

            function saveServiceState(serviceNode, stateObject) {
                var key = getServiceUniqueKey(serviceNode);

                stateObject[key] = {
                    opacity: serviceNode.opacity,
                    checked: serviceNode.checked
                };
                if (serviceNode.esriService && !(_.isEqual(serviceNode.esriService.visibleLayers, [-1])) && (serviceNode.serviceType === "dynamic")) {
                    stateObject[key].visibleLayerIds = getLayerIds(serviceNode.esriService);
                }
                if (serviceNode.type === "group-service") {
                    stateObject[key].visibleServices = _.map(serviceNode.children, function(child) {
                        return child.checked;
                    });
                }

                if (!stateObject.version) {
                    stateObject.version = _currentStateCodeVersion;
                }
            }

            function getLayerIds(esriService) {
                return (!esriService || !esriService.visibleLayers || esriService.visibleLayers[0] === -1 ? [] : esriService.visibleLayers);
            }

            // To show/hide an individual layer we have to specify all visible layers for the service.
            // So we keep track of the visible layer ids on the service-level data node.

            function showOrHideLayer(node, shouldShow, map) {
                var layerNode = node.raw, serviceNode = getServiceNode(layerNode);

                if ((serviceNode) && (!serviceNode.groupAsService)) {
                    var esriService = getServiceObject(serviceNode, map);
                }

                if ((layerNode.type === "layer") || (layerNode.type === "layer-group")) {
                    var layerIds = getLayerIds(esriService);
                    if (shouldShow) {
                        //add checked layer from the visible layers array
                        if (layerNode.type === "layer") {
                            layerIds = _.union(layerIds, [layerNode.layerId]);
                        }
                        if (layerNode.type === "layer-group") {
                            node.cascadeBy(function() {
                                if (this.get('checked')) {
                                    if (this.raw.leaf) {
                                        layerIds = _.union(layerIds, this.raw.layerId);
                                    }
                                }
                            });
                        }
						if (layerNode.visibleSubLayerIds) { layerIds = _.union(layerIds, layerNode.visibleSubLayerIds); }
                    } else {
                        //remove unchecked layer from the visible layers array
                        if (layerNode.type === "layer") {
                            layerIds = _.without(layerIds, layerNode.layerId);
                        }
                        if (layerNode.type === "layer-group") {
                            node.cascadeBy(function() {
                                layerIds = _.without(layerIds, this.raw.layerId);
                            });
                        }
						if (layerNode.visibleSubLayerIds) {
							_.each(layerNode.visibleSubLayerIds, function(subLayer) {
								layerIds = _.without(layerIds, subLayer);
							});
						}
                    }
                    //set visible layers in the dynamic map service based on checked layerIds
                    if (layerIds.length === 0) {
                        esriService.setVisibleLayers([-1]); // clear visible layers
                    } else {
                        esriService.setVisibleLayers(layerIds);
                    }
                    //check parent nodes if they are unchecked and show dynamic service layer
                    if (node.get('checked')) {
                        node.parentNode.set('checked', true);
                        node.parentNode.raw.checked = true;

                        var parent = node.parentNode;
                        while (parent) {
                            if (parent.raw.type == "layer-group") {
                                parent.parentNode.set('checked', true);
                                parent.parentNode.raw.checked = true;
                            }
                            parent = parent.parentNode;
                        }

                        esriService.show();
                    }

                } else if (layerNode.type === "service") {
                    if (shouldShow) {
                        if (node.parentNode.raw.type == "group-service") {
                            node.parentNode.set('checked', true);
                            node.parentNode.raw.checked = true;
                        }
                        esriService.show();
                    } else {
                        esriService.hide();
                    }
                } else if (layerNode.type === "group-service") {
                    node.cascadeBy(function() {
                        if (this.get('checked') === true) {
                            if (this.raw.type === "service") {
                                if (shouldShow) {
                                    this.raw.esriService.show();
                                } else {
                                    this.raw.esriService.hide();
                                }
                            }
                        }
                    });
                }
            }

            function getServiceNode(layerNode) {
                if (layerNode.type === "service") {
                    var node = layerNode;
                } else if ((layerNode.type === "layer") || (layerNode.type === "layer-group")) {
                    var parent = layerNode.parent;
                    while (parent) {
                        if (parent.type == "service") {
                            node = parent;
                            break;
                        }
                        parent = parent.parent;
                    }
                }
                return node;
            }

            function getServiceObject(serviceNode, map) {
                if (serviceNode.esriService === undefined) {
                    // This node's service has no layer object yet, so make one and cache it
                    if (serviceNode.serviceType === "dynamic") {
                        serviceNode.esriService = new ArcGISDynamicMapServiceLayer(serviceNode.url, serviceNode.params);
                        if (_.has(serviceNode, "children")) {
                            serviceNode.esriService.setVisibleLayers([-1]);
                        }
                        if (_.has(serviceNode, "visibleLayerIds")) {
                            serviceNode.esriService.setVisibleLayers(serviceNode.visibleLayerIds);
                        }
                    } else if (serviceNode.serviceType === "tiled") {
                        serviceNode.esriService = new ArcGISTiledMapServiceLayer(serviceNode.url, serviceNode.params);
                    } else if (serviceNode.serviceType === "feature-layer") {
                        serviceNode.esriService = new FeatureLayer(serviceNode.url, serviceNode.params);
                        if (_.has(serviceNode, "symbology")) {
                            serviceNode.esriService.setRenderer(new esri.renderer.SimpleRenderer(serviceNode.symbology));
                        }
                        if (_.has(serviceNode, "layerDefinition")) {
                            serviceNode.esriService.setDefinitionExpression(serviceNode.layerDefinition);
                        }
                    }
                    map.addLayer(serviceNode.esriService);
                }

                return serviceNode.esriService;
            }

            function setOpacity(serviceNode, map, opacity) {
                if (serviceNode.type === "group-service") {
                    if (serviceNode.children) {
                        _.each(serviceNode.children, function(service) {
                            if (service.esriService) {
                                service.esriService.setOpacity(opacity);
                            }
                        });
                    }
                } else {
                    var esriService = getServiceObject(serviceNode, map);
                    esriService.setOpacity(opacity);
                }
                serviceNode.opacity = opacity;
            }

            function fetchMetadata(layerNode, callback) {
                var serviceNode = getServiceNode(layerNode), url = serviceNode.url + "/" + layerNode.layerId;
                $.ajax({
                    dataType: 'jsonp',
                    url: url + "?f=json",
                    success: function(metadata) {
                        layerNode.description = metadata.description || "No description or metadata available for this layer.";
                        layerNode.extent = new Extent(metadata.extent);
                        layerNode.url = url;
                        layerNode.opacity = "setByService";
                        callback();
                    },
                    error: _onLayerSourceLoadError
                });
            }

            // Merge items based on id and parentLayerId properties
            function mergeLayerMetadata(layers, layerMetadata) {
                var key = function(item) {
                        return [item.id || 0, item.parentLayerId || 0];
                    },
                    hashMap = _.object(_.map(layerMetadata, function(item) {
                        return [key(item), item];
                    })),
                    result = _.map(layers, function(layer) {
                        var metadata = hashMap[key(layer)];
                        if (metadata) {
                            return _.extend(layer, metadata);
                        }
                        return layer;
                    });
                return result;
            }

        };

        return AgsLoader;
    }
);
