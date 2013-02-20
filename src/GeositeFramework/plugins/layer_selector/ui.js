// Module ui.js

define([], //"./ext-4.1.1a_full/ext-all"],
    function () {
        var Ui = function (map) {
            var _map = map;

            this.render = function (rootNode, domElement) {
                sortFolders([rootNode]);
                renderTree(rootNode, domElement);
            }

            function renderTree(rootNode, domElement) {
                var store = Ext.create('Ext.data.TreeStore', {
                    root: rootNode,
                    fields: ['text', 'leaf', 'cls', 'url', 'layerId']
                });
                var tree = Ext.create('Ext.tree.Panel', {
                    store: store,
                    rootVisible: false,
                    renderTo: domElement,
                    resizable: false,
                    collapsible: false,
                    autoScroll: false,
                    height: '100%',
                    width: '100%'
                });
                tree.show();
                tree.on("checkchange", onCheckboxChanged, this)
            }

            function sortFolders(nodes) {
                // Sort folder entries at this level
                nodes.sort(function (node1, node2) {
                    return node1.text.toLowerCase() > node2.text.toLowerCase() ? 1 : -1;
                });
                // Recurse to sort subfolders
                _.each(nodes, function (node) {
                    if (!node.leaf && node.children !== null && node.children.length > 0) {
                        sortFolders(node.children);
                    }
                });
            }

            function onCheckboxChanged(node, checked, eOpts) {
                var layerData = node.raw,
                    serviceData = getServiceData(layerData),
                    esriLayer = serviceData.esriLayer,
                    layerIds = serviceData.layerIds;
                if (esriLayer === undefined) {
                    // This node's service has no layer object yet, so make one and cache it
                    esriLayer = new esri.layers.ArcGISDynamicMapServiceLayer(serviceData.url, { opacity: 0.7 });
                    _map.addLayer(esriLayer);
                    serviceData.esriLayer = esriLayer;
                    layerIds = [];
                }
                if (checked) {
                    layerIds = _.union(layerIds, [layerData.layerId]);
                } else {
                    layerIds = _.without(layerIds, layerData.layerId);
                }
                if (layerIds.length === 0) {
                    esriLayer.setVisibleLayers([-1]); // clear visible layers
                } else {
                    esriLayer.setVisibleLayers(layerIds);
                }
                serviceData.layerIds = layerIds;
            }
        }

        function getServiceData(layerData) {
            if (layerData.parent.type == "service") {
                return layerData.parent;
            } else {
                return layerData.parent.parent;
            }
        }

        return Ui;
    }
);