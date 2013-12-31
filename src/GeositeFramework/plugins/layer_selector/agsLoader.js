// Module AgsLoader.js

define(["jquery", "use!underscore"],
    function ($, _) {
        dojo.require("esri.layers.FeatureLayer");
        dojo.require("esri.utils");
        dojo.require("dojo.DeferredList");
        var AgsLoader = function(baseUrl, source) {
            var _baseUrl = baseUrl,
                _folderConfigs = null,
                _makeContainerNode = null,
                _makeLeafNode = null,
                _onLayerSourceLoaded = null,
                _onLayerSourceLoadError = null,
                _source = source;

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
                var folderDeferreds = _.map(folderConfigs, function (folderConfig) {
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
                        timeout: 10000
                    }).then(function (results) {
                        return _.extend(result, { success: true, results: results });
                    }, function(error) {
                        return _.extend(result, { success: false, results: error });
                    });
                });

                new dojo.DeferredList(folderDeferreds).then(function (data) {
                    var results = _.map(data, function(result) {
                        var item = result[1];
                        if (item.success) {
                            return processFolderSuccess(item.results, item.folderConfig, item.url, item.node);
                        } else {
                            return processFolderError(item.results, item.folderConfig, item.url, item.node);
                        }
                    });
                    var serviceDataSpecs = _.flatten(results, true);
                    var mapServerServiceSpecs = _.filter(serviceDataSpecs, function (spec) {
                        return (spec.type === "MapServer") && (!spec.error);
                    });
                    var services = _.map(mapServerServiceSpecs, function(service) {
                        var url = service.url + "/" + service.name + "/MapServer";
                        return esri.request({
                            url: url,
                            content: { f: "json" },
                            handleAs: "json",
                            callbackParamName: "callback",
                            timeout: 10000
                        }).then(function (results) {
                            return [results, service];
                        }, function (error) {
                            return [{ "error": { "message": "Error: Failed to load map service (" + error.message + ")." } }, service];
                        });
                    });
                    var serviceDefs = new dojo.DeferredList(services);
                    serviceDefs.then(function(results) {
                        if ((serviceDataSpecs.length != results.length) || (results[0] === 0)) {
                            var serviceGuids = _.pluck(serviceDataSpecs, "guid"),
                                resultsServices = [];
                            if ((results[0][1]) && (results[0][1].length > 0)) {
                                var resultsGuids = _.map(results, function(result) {
                                    if (result[1][1]) {
                                        return result[1][1].guid;
                                    }
                                });
                                _.each(serviceGuids, function(guid, i) {
                                    var index = _.indexOf(resultsGuids, guid);
                                    if (index > -1) {
                                        resultsServices.push(results[index]);
                                    } else {
                                        resultsServices.push([true, [{ "error": { "message": serviceDataSpecs[i].error } }, serviceDataSpecs[i]]]);
                                    }
                                });
                            } else {
                                _.each(serviceDataSpecs, function(service) {
                                    resultsServices.push([true, [{ "error": { "message": service.error } }, service]]);
                                });
                            }
                        } else {
                            resultsServices = results;
                        }

                        var serviceSpecs = _.map(resultsServices, function(result) { return result[1][1]; });
                        var serviceInfos = _.map(resultsServices, function(result) { return result[1][0]; });
                        _.each(serviceSpecs, function(serviceSpec, i) {
                            var serviceData = serviceInfos[i],
                                serviceName = getServiceName(serviceSpec.name),
                                serviceObjects = [];
                            _.each(_source.folders, function(folder) {
                                serviceObjects = $.merge($.merge([], serviceObjects), folder.services);
                            });
                            var currentService = _.find(serviceObjects, function(s) {
                                return s.guid == serviceSpec.guid;
                            });
                            var serviceUrl = serviceSpec.url + "/" + serviceSpec.name + "/MapServer";

                            var node = _makeContainerNode(serviceName, "service", serviceSpec.parentNode);
                            node.text = (_.has(currentService, "displayName")) ? currentService.displayName : node.text;
                            node.serviceName = serviceSpec.name;
                            if (_.has(serviceData, "error")) {
                                node.text = node.text + " (Unavailable)";
                                node.description = serviceData.error.message;
                                node.url = serviceUrl;
                                delete node.children;
                                node.leaf = true;
                                if (_.has(node.parent, "groupAsService")) {
                                    node.cls = "pluginLayerSelector-layer";
                                }
                            } else {
                                if (serviceData.description == "") {
                                    var description = "No description or metadata available for this map service.";
                                } else {
                                    var description = serviceData.description;
                                }
                                node.description = description;
                                node.opacity = (_.has(currentService, "opacity")) ? currentService.opacity : 0.7;
                                node.params = { "opacity": node.opacity };
                                node.extent = new esri.geometry.Extent(serviceData.fullExtent);
                                node.checked = false;
                                node.serviceType = currentService.type;
                                node.setOpacity = setOpacity;
                                node.hideAllLayers = hideAllLayers;
                                node.saveServiceState = saveServiceState;
                                node.setServiceState = setServiceState;
                                node.showOrHideLayer = showOrHideLayer;

                                if (node.serviceType === "dynamic") {
                                    node.url = serviceUrl;
                                    if (_.has(currentService, "showLayers")) {
                                        if (currentService.showLayers.length > 0) {
                                            var layers = _.map(currentService.showLayers, function(i) {
                                                var item = _.find(serviceData.layers, function(s) {
                                                    if (s.id == i.id) {
                                                        return s;
                                                    }
                                                });
                                                var layer = _.clone(item);
                                                if (_.has(i, "parentLayerId")) {
                                                    layer.parentLayerId = i.parentLayerId;
                                                }
                                                if (_.has(i, "displayName")) {
                                                    layer.name = i.displayName;
                                                }
                                                return layer;
                                            });
                                            loadLayers(layers, node);
                                        } else {
                                            delete node.children;
                                            node.leaf = true;
                                            node.text = node.text + ' <div class="pluginLayer-extent-zoom">';
                                            if (_.has(currentService, "visibleLayerIds")) {
                                                node.visibleLayerIds = currentService.visibleLayerIds;
                                            }
                                        }
                                    } else {
                                        loadLayers(serviceData.layers, node);
                                    }
                                } else if (node.serviceType === "tiled") {
                                    node.url = serviceUrl;
                                    delete node.children;
                                    node.text = node.text + ' <div class="pluginLayer-extent-zoom">';
                                    node.leaf = true;
                                    if (_.has(currentService, "displayLevels")) {
                                        node.params.displayLevels = currentService.displayLevels;
                                    }
                                } else if (node.serviceType === "feature-layer") {
                                    node.url = serviceUrl + "/" + currentService.layerIndex;
                                    delete node.children;
                                    node.text = node.text + ' <div class="pluginLayer-extent-zoom">';
                                    node.leaf = true;
                                    if (_.has(currentService, "mode")) {
                                        var modes = {
                                            "snapshot": esri.layers.FeatureLayer.MODE_SNAPSHOT,
                                            "ondemand": esri.layers.FeatureLayer.MODE_ONDEMAND,
                                            "selection": esri.layers.FeatureLayer.MODE_SELECTION
                                        };
                                        var mode = modes[currentService.mode];
                                        node.params.mode = mode;
                                    }
                                    if (_.has(currentService, "symbology")) {
                                        var symbol = getLayerSymbology(currentService.symbology);
                                        node.symbology = symbol;
                                    }
                                    if (_.has(currentService, "outFields")) {
                                        node.params.outFields = currentService.outFields;
                                    }
                                    if (_.has(currentService, "autoGeneralize")) {
                                        node.params.autoGeneralize = currentService.autoGeneralize;
                                    }
                                    if (_.has(currentService, "displayOnPan")) {
                                        node.params.displayOnPan = currentService.displayOnPan;
                                    }
                                    if (_.has(currentService, "layerDefinition")) {
                                        node.layerDefinition = currentService.layerDefinition;
                                    }
                                }
                                if (_.has(currentService, "id")) {
                                    node.params.id = currentService.id;
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

                        });
                    }, function(error) {
                        //console.log("-----------------------------failed-----------------------------");
                        //console.log(error);
                    });

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
                        node.description = (folderConfig.description) ? folderConfig.description : "No description or metadata available for this map service.";
                        node.groupAsService = true;
                    } else {
                        node = makeGroupContainerNode(folderConfig, parentNode.parent, "folder");
                    }
                } else {
                    var displayName = (_.has(folderConfig, "displayName")) ? folderConfig.displayName : folderName;
                    node = (folderName == "") ? parentNode : getOrMakeContainerNode(displayName, parentNode, "folder");
                }

                var services;
                if (folderConfig.services && folderConfig.services.length > 0) {
                    services = _.map(folderConfig.services, function (serviceConfig) {
                        var item = _.find(entries.services, function(service) {
                            return getServiceName(service.name) == serviceConfig.name;
                        });
                        if (_.isUndefined(item)) {
                            item = processServiceError(serviceConfig, folderName, node, url, "Map service unavailable or invalid url");
                        }
                        return item;
                    });
                } else {
                    services = entries.services;
                }

                _.each(services, function(service, i) {
                    service.guid = folderConfig.services[i].guid;
                });

                addPropsToServiceSpecs(node, url, services);
                return services;
            }

            function processFolderError(error, folderConfig, url, parentNode) {
                var node,
                    folderName = folderConfig.name;
                if (_.has(folderConfig, "groupFolder")) {
                    node = makeGroupContainerNode(folderConfig, parentNode.parent, "folder");
                } else {
                    var displayName = (_.has(folderConfig, "displayName")) ? folderConfig.displayName : folderName;
                    node = (folderName == "") ? parentNode : getOrMakeContainerNode(displayName, parentNode, "folder");
                }
                var services = _.map(folderConfig.services, function(service) {
                    var item = processServiceError(service, folderName, node, url, error.message);
                    return item;
                });
                return services;
            }

            function addPropsToServiceSpecs(parentNode, url, serviceSpecs) {
                // When a service is loaded we'll want to know where to hang its tree nodes
                _.each(serviceSpecs, function(serviceSpec) {
                    var folder = serviceSpec.name.split("/")[0];
                    var cleanUrl = url.split("/" + folder)[0];
                    serviceSpec.url = cleanUrl;
                    serviceSpec.parentNode = parentNode;
                });
            }

            function makeGroupContainerNode(server, parentNode, type) {
                var node = parentNode;
                if ((server.groupFolder) && (server.groupFolder != "")) {
                    var path = server.groupFolder.split("/");
                    //check if containers exist, if not, make them
                    _.each(path, function(name) {
                        node = getOrMakeContainerNode(name, node, type);
                    });
                }
                return node;
            }

            function getOrMakeContainerNode(name, parentNode, type) {
                var node;
                if ((parentNode.children) && (parentNode.children.length > 0)) {
                    var folder = _.find(parentNode.children, function(child) {
                        return child.text == name;
                    });
                    node = (_.isUndefined(folder)) ? _makeContainerNode(name, type, parentNode) : folder;
                } else {
                    node = _makeContainerNode(name, type, parentNode);
                }
                return node;
            }

            function processServiceError(service, folderName, node, url, error) {
                var item = {};
                item.guid = service.guid;
                item.name = (folderName === "") ? service.name : folderName + "/" + service.name;
                item.type = "MapServer";
                item.parentNode = node;
                item.url = url;
                item.error = "Error: Failed to load map service (" + error + ").";
                return item;
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
                ;
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

            function getServiceName(name) {
                // "Alabama/Bathymetry" => "Bathymetry"
                return (name.indexOf('/') == -1 ? name : name.split('/')[1]);
            }

            function loadLayers(layerSpecs, serviceNode) {
                var layerNodes = {};
                _.each(layerSpecs, function(layerSpec) {
                    // A layer might specify a parent layer; otherwise it hangs off the service
                    var parentNode = (layerSpec.parentLayerId === -1 ? serviceNode : layerNodes[layerSpec.parentLayerId]);
                    if (layerSpec.subLayerIds === null) {
                        // This is an actual layer
                        var node = _makeLeafNode(layerSpec.name, layerSpec.id, showOrHideLayer, parentNode);
                        node.fetchMetadata = fetchMetadata;
                    } else {
                        // This is a layer group; remember its node so its children can attach themselves
                        layerNodes[layerSpec.id] = _makeContainerNode(layerSpec.name, "layer-group", parentNode);
                        layerNodes[layerSpec.id].checked = false;
                        layerNodes[layerSpec.id].showOrHideLayer = showOrHideLayer;
                    }
                }, this);
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

            function setServiceState(serviceNode, stateObject, map) {
                var myStateObject = stateObject[serviceNode.name], esriService;
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
                                esriService.setVisibleLayers(myStateObject.visibleLayerIds);
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
                stateObject[serviceNode.name] = {
                    opacity: serviceNode.opacity,
                    checked: serviceNode.checked
                };
                if (serviceNode.esriService && !(_.isEqual(serviceNode.esriService.visibleLayers, [-1])) && (serviceNode.serviceType === "dynamic")) {
                    stateObject[serviceNode.name].visibleLayerIds = getLayerIds(serviceNode.esriService);
                }
                if (serviceNode.type === "group-service") {
                    stateObject[serviceNode.name].visibleServices = _.map(serviceNode.children, function(child) {
                        return child.checked;
                    });
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
                                    if (this.raw.layerId) {
                                        layerIds = _.union(layerIds, this.raw.layerId);
                                    }
                                }
                            });
                        }
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
                        serviceNode.esriService = new esri.layers.ArcGISDynamicMapServiceLayer(serviceNode.url, serviceNode.params);
                        if (_.has(serviceNode, "children")) {
                            serviceNode.esriService.setVisibleLayers([-1]);
                        }
                        if (_.has(serviceNode, "visibleLayerIds")) {
                            serviceNode.esriService.setVisibleLayers(serviceNode.visibleLayerIds);
                        }
                    } else if (serviceNode.serviceType === "tiled") {
                        serviceNode.esriService = new esri.layers.ArcGISTiledMapServiceLayer(serviceNode.url, serviceNode.params);
                    } else if (serviceNode.serviceType === "feature-layer") {
                        serviceNode.esriService = new esri.layers.FeatureLayer(serviceNode.url, serviceNode.params);
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
                        layerNode.description = (metadata.description != "") ? metadata.description : "No description or metadata available for this layer.";
                        layerNode.extent = new esri.geometry.Extent(metadata.extent);
                        layerNode.url = url;
                        layerNode.opacity = "setByService";
                        callback();
                    },
                    error: _onLayerSourceLoadError
                });
            }

        };

        return AgsLoader;
    }
);
