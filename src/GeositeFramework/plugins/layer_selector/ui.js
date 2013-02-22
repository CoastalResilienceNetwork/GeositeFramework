// Module Ui.js

define(["use!underscore", "use!extjs"],
    function (_, Ext) {
        var Ui = function (container, map) {
            var _map = map,
                _container = container,
                _tree = null;

            this.render = function (rootNode) {
                sortFolders([rootNode]);
                _tree = createTree(rootNode);
                _tree.on("checkchange", onCheckboxChanged, this);
                _tree.show();
            }

            this.display = function () {
                if (_tree !== null) {
                    _tree.hide();
                    _tree.show();
                }
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

            function createTree(rootNode) {
                var store = Ext.create('Ext.data.TreeStore', {
                    root: rootNode,
                    fields: ['text', 'leaf', 'cls', 'url', 'layerId']
                });
                var tree = Ext.create('Ext.tree.Panel', {
                    store: store,
                    rootVisible: false,
                    renderTo: _container,
                    resizable: false,
                    collapsible: false,
                    autoScroll: false,
                    height: '100%',
                    width: '100%'
                });
                return tree;
            }

            function onCheckboxChanged(node, checked, eOpts) {
                var layerData = node.raw;
                layerData.showOrHideLayer(layerData, checked, _map);
            }
        }

        return Ui;
    }
);