// Module ui.js

define([], //"./ext-4.1.1a_full/ext-all"],
    function () {

        function renderTree(rootNode, domElement) {
            var store = Ext.create('Ext.data.TreeStore', {
                root: rootNode,
                fields: ['text', 'leaf', 'cls', 'url', 'layerId']
            });
            var tree = Ext.create('Ext.tree.Panel', {
                store: store,
                rootVisible: false,
                height: 2000,
                autoScroll: true,
                title: 'Map Layers',
                x: 100,
                y: 100,
                renderTo: domElement,
                width: 300,
                height: 240,
                resizable: true,
                collapsible: true,
                autoScroll: true,
            });
            tree.show();
        }

        function sortFolders(nodes) {
            // Sort folder entries at this level
            nodes.sort(function (node1, node2) {
                return node1.text.toLowerCase() > node2.text.toLowerCase() ? 1 : -1;
            });
            // Recurse to sort subfolders
            _.each(nodes, function (node) {
                if (!node.leaf && node.children.length > 0) {
                    sortFolders(node.children);
                }
            });
        }

        var ui = {
            render: function (rootNode, domElement) {
                sortFolders([rootNode]);
                renderTree(rootNode, domElement);
            }
        }

        return ui;
    }
);