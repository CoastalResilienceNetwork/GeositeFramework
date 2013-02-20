// Module AgsLoader.js

define([],   //["./lib/jquery-1.9.0.min", "./lib/underscore-1.4.3.min"],
    function () {   //($, _) {
        var AgsLoader = function (baseUrl) {
            var _baseUrl = baseUrl;
            var _loaded = false;

            // Load hierarchy of folders, services, and layers from an ArcGIS Server via its REST API.
            // The catalog root contains folders and/or services.
            // Each folder contains additional services.
            // Each "MapServer" service exposes a number of layers.
            // A layer entry may actually be a group, containing other layers in the same collection.

            // Use the catalog data to build a node tree for Ext.data.TreeStore and Ext.tree.Panel

            this.load = loadCatalog;
            this.isLoaded = function () { return _loaded; }

            function loadCatalog(rootNode) {
                // Load root catalog entries
                loadFolder("", function (entries) {
                    console.log("Catalog has " + entries.folders.length + " folders");
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
                        var node = makeContainerNode(folderName, "folder", parentNode);
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
                    error: handleAjaxError
                });
            }

            function loadServices(serviceSpecs) {
                // Start loading all services, keeping "deferred" objects so we know when they're done
                var deferreds = _.map(serviceSpecs, loadService);
                // When all services have loaded, we're done!
                $.when.apply($, deferreds).then(function () {
                    _loaded = true;
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
                            var node = makeContainerNode(serviceName, "service", serviceSpec.parentNode);
                            node.url = serviceUrl;
                            loadLayers(serviceData.layers, node);
                        },
                        error: handleAjaxError
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
                        makeLeafNode(layerSpec, parentNode);
                    } else {
                        // This is a layer group; remember its node so its children can attach themselves
                        layerNodes[layerSpec.id] = makeContainerNode(layerSpec.name, "layer-group", parentNode);
                    }
                }, this);
            }

            function makeContainerNode(name, type, parentNode) {
                var node = {
                    type: type,
                    cls: "pluginLayerSelector-" + type, // When the tree is displayed the node's associated DOM element will have this CSS class
                    text: name.replace(/_/g, " "),
                    leaf: false,
                    children: [],
                    parent: parentNode
                };
                parentNode.children.push(node);
                return node;
            }

            function makeLeafNode(layerSpec, parentNode) {
                var node = {
                    type: "layer",
                    cls: "pluginLayerSelector-layer", // When the tree is displayed the node's associated DOM element will have this CSS class
                    text: layerSpec.name.replace(/_/g, " "),
                    leaf: true,
                    checked: false,
                    layerId: layerSpec.id,
                    parent: parentNode,
                    onCheckboxChanged: onCheckboxChanged
                };
                parentNode.children.push(node);
                return node;
            }

            function handleAjaxError(jqXHR, textStatus, errorThrown) {
                // TODO: do something better
                alert('AJAX error: ' + errorThrown);
            }

            function onCheckboxChanged(layerNode, checked, map) {
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
                if (checked) {
                    layerIds = _.union(layerIds, [layerNode.layerId]);
                } else {
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
        }

        return AgsLoader;
    }
);