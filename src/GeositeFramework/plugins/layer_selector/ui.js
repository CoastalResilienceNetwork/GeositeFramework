// Module Ui.js

define(["jquery", "use!underscore", "use!extjs"],
    function (jquery, _, Ext) {
        var Ui = function (container, map) {
            var _map = map,
                _container = container,
                _tree = null;

            this.render = function (rootNode) {
                sortFolders([rootNode]);
                removeSpinner();
                _tree = createTree(rootNode, _container);
                _tree.on("checkchange", onCheckboxChanged, this);
                _tree.show();
            }

            this.display = function () {
                if (_tree !== null) {
                    _tree.hide();
                    _tree.show();
                }
            }

            function addSpinner(self) {
                $(_container).append("<div class='pluginLayerSelector-spinner'></div>");
            }

            function removeSpinner(self) {
                $(_container).children().last().remove();
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

            function createTree(rootNode, container) {
                var store = Ext.create('Ext.data.TreeStore', {
                    root: rootNode,
                    fields: ['text', 'leaf', 'cls', 'url', 'layerId']
                });
                var tree = Ext.create('Ext.tree.Panel', {
                    store: store,
                    rootVisible: false,
                    renderTo: container,
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

            addSpinner();
        }

        return Ui;
    }
);