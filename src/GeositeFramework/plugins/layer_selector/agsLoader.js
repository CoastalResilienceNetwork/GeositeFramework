// Module AgsLoader.js

define(["jquery", "use!underscore"],
    function ($, _) {
        var AgsLoader = function (baseUrl) {
            var _baseUrl = baseUrl,
                _makeContainerNode = null,
                _makeLeafNode = null,
                _onLayerSourceLoaded = null,
                _onLayerSourceLoadError = null;

            // Load hierarchy of folders, services, and layers from an ArcGIS Server via its REST API.
            // The catalog root contains folders and/or services.
            // Each folder contains additional services.
            // Each "MapServer" service exposes a number of layers.
            // A layer entry may actually be a group, containing other layers in the same collection.

            this.load = loadCatalog;

            function loadCatalog(rootNode, layerIdWhitelist, makeContainerNode, makeLeafNode, onLayerSourceLoaded, onLayerSourceLoadError) {
                // Load root catalog entries
                _makeContainerNode = makeContainerNode;
                _makeLeafNode = makeLeafNode;
                _onLayerSourceLoaded = onLayerSourceLoaded;
                _onLayerSourceLoadError = onLayerSourceLoadError;
                loadFolder("", function (entries) {
                    // Root of catalog has loaded -- load child folders and services
                    addParentNodeToServiceSpecs(rootNode, entries.services);
                    loadFolders(entries.folders, entries.services, rootNode);
                });
            }

            function addParentNodeToServiceSpecs(parentNode, serviceSpecs) {
                // When a service is loaded we'll want to know where to hang its tree nodes
                _.each(serviceSpecs, function (serviceSpec) {
                    serviceSpec.parentNode = parentNode;
                });
            }

            function loadFolders(folderNames, serviceSpecs, parentNode) {
                // Start loading all folders, keeping "deferred" objects so we know when they're done
                var deferreds = _.map(folderNames, function (folderName) {
                    return loadFolder(folderName, function (entries) {
                        // Folder has loaded -- make its node and add its services to "serviceSpecs"
                        var node = _makeContainerNode(folderName, "folder", parentNode);
                        addParentNodeToServiceSpecs(node, entries.services);
                        $.merge(serviceSpecs, entries.services);
                    });
                });
                // When all folders have loaded, load the services
                $.when.apply($, deferreds).then(function () {
                    loadServices(serviceSpecs);
                });
            }

            function loadFolder(folderName, success) {
                return $.ajax({
                    dataType: 'jsonp',
                    url: _baseUrl + (folderName === "" ? "" : "/" + folderName) + '?f=json',
                    success: success,
                    error: _onLayerSourceLoadError
                });
            }

            function loadServices(serviceSpecs) {
                // Start loading all services, keeping "deferred" objects so we know when they're done
                var deferreds = _.map(serviceSpecs, loadService);
                $.when.apply($, deferreds).then(function () {
                    // All services have loaded, so report that we're done loading this base URL
                    _onLayerSourceLoaded(_baseUrl);
                });
            }

            function loadService(serviceSpec) {
                if (serviceSpec.type === "MapServer") {
                    var serviceUrl = _baseUrl + "/" + serviceSpec.name + "/MapServer";
                    return $.ajax({
                        dataType: 'jsonp',
                        url: serviceUrl + "?f=json",
                        success: function (serviceData) {
                            // Service has loaded -- make its node and load its layers
                            var serviceName = getServiceName(serviceSpec.name);
                            var node = _makeContainerNode(serviceName, "service", serviceSpec.parentNode);
                            node.url = serviceUrl;
                            node.identify = identify;
                            loadLayers(serviceData.layers, node);
                        },
                        error: _onLayerSourceLoadError
                    });
                }
            }

            function getServiceName(name) {
                // "Alabama/Bathymetry" => "Bathymetry"
                return (name.indexOf('/') == -1 ? name : name.split('/')[1]);
            }

            function loadLayers(layerSpecs, serviceNode) {
                var layerNodes = {};
                _.each(layerSpecs, function (layerSpec) {
                    // A layer might specify a parent layer; otherwise it hangs off the service
                    var parentNode = (layerSpec.parentLayerId === -1 ? serviceNode : layerNodes[layerSpec.parentLayerId]);
                    if (layerSpec.subLayerIds === null) {
                        // This is an actual layer
                        _makeLeafNode(layerSpec.name, layerSpec.id, showOrHideLayer, parentNode);
                    } else {
                        // This is a layer group; remember its node so its children can attach themselves
                        layerNodes[layerSpec.id] = _makeContainerNode(layerSpec.name, "layer-group", parentNode);
                    }
                }, this);
            }

            // To show/hide an individual layer we have to specify all visible layers for the service. 
            // So we keep track of the visible layer ids on the service-level data node.

            function showOrHideLayer(layerNode, shouldShow, map) {
                var serviceNode = getServiceNode(layerNode),
                    esriLayer = serviceNode.esriLayer,
                    layerIds = serviceNode.layerIds;
                if (esriLayer === undefined) {
                    // This node's service has no layer object yet, so make one and cache it
                    esriLayer = new esri.layers.ArcGISDynamicMapServiceLayer(serviceNode.url, { opacity: 0.7 });
                    map.addLayer(esriLayer);
                    serviceNode.esriLayer = esriLayer;
                    layerIds = [];
                }
                if (shouldShow) {
                    layerIds = _.union(layerIds, [layerNode.layerId]);
                } else { // hide
                    layerIds = _.without(layerIds, layerNode.layerId);
                }
                if (layerIds.length === 0) {
                    esriLayer.setVisibleLayers([-1]); // clear visible layers
                } else {
                    esriLayer.setVisibleLayers(layerIds);
                }
                serviceNode.layerIds = layerIds;
            }

            function getServiceNode(layerNode) {
                if (layerNode.parent.type === "service") {
                    return layerNode.parent;
                } else {
                    return layerNode.parent.parent;
                }
            }

            dojo.require("esri.tasks.identify");

            function identify(serviceNode, map, point) {
                if (serviceNode.layerIds && serviceNode.layerIds.length > 0) {
                    // This service node has some visible layers, so execute an "identify" task
                    identifyParams = new esri.tasks.IdentifyParameters();
                    identifyParams.tolerance = 0;
                    identifyParams.layerIds = serviceNode.layerIds;
                    identifyParams.layerOption = esri.tasks.IdentifyParameters.LAYER_OPTION_VISIBLE;
                    identifyParams.width = map.width;
                    identifyParams.height = map.height;
                    identifyParams.geometry = point;
                    identifyParams.mapExtent = map.extent;

                    var identifyTask = new esri.tasks.IdentifyTask(serviceNode.url);
                    var  deferred = identifyTask.execute(identifyParams);
                    return deferred;
                }
            }

        }

        return AgsLoader;
    }
);