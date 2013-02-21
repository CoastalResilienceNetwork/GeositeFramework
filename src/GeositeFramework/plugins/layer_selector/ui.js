// Module Ui.js

define(["underscore"],
    function (_) {
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
                var layerData = node.raw;
                layerData.showOrHideLayer(layerData, checked, _map);
            }
        }

        return Ui;
    }
);