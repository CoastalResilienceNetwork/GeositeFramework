// Module Ui.js

require(["jquery.placeholder"]);
define(["jquery", "use!underscore", "use!extjs", "./treeFilter"],
    function ($, _, Ext, treeFilter) {
        $('input, textarea').placeholder(); // initialize jquery.placeholder

        var Ui = function (container, map) {
            var _map = map,
                _container = container,
                _$filterInput = null,
                _$treeContainer = null,
                _tree = null;

            this.render = function (rootNode) {
                sortFolders([rootNode]);
                _tree = createTree(rootNode);
                _tree.on("checkchange", onCheckboxChanged, this);
                removeSpinner();
                renderUi();
                this.display();
            }

            this.display = function () {
                // The Ext tree doesn't render right unless the container is visible
                if (_tree !== null && $(_container).is(":visible")) {
                    _tree.render(_$treeContainer[0]);
                    _$filterInput.focus();
                }
            }

            function addSpinner() {
                $(_container).append(
                    $('<div>', { 'class': 'pluginLayerSelector-spinner' })
                );
            }

            function removeSpinner() {
                $(_container).empty();
            }

            function renderUi() {
                _$filterInput = $('<input>', {
                    type: 'text',
                    keyup: onFilterBoxKeyup
                })
                    .attr('placeholder', 'Filter Map Layers');

                _$treeContainer = $('<div>', {
                    'class': 'pluginLayerSelector-tree-container'
                });
                $(_container).append(
                    $('<div>', { 'class': 'pluginLayerSelector-search' }).append(
                        _$filterInput,
                        $('<button>').hide()
                    ),
                    $('<div>', { 'class': 'pluginLayerSelector-rest' }).append(
                        _$treeContainer
                    )
                );
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

            Ext.define('FilteredTreePanel', {
                extend: 'Ext.tree.Panel',
                mixins: { treeFilter: 'layer_selector.lib.TreeFilter' }
            });

            function createTree(rootNode) {
                var store = Ext.create('Ext.data.TreeStore', {
                    root: rootNode,
                    fields: ['text', 'leaf', 'cls', 'url', 'layerId']
                });
                var tree = Ext.create('FilteredTreePanel', {
                    store: store,
                    rootVisible: false,
                    width: 'auto',
                    animate: false,
                    scroll: false,
                    border: false,
                    listeners: {
                        load: resize,
                        itemexpand: resize,
                        itemcollapse: resize
                    }
                });
                return tree;
            }

            function resize() {
                // Hack from http://stackoverflow.com/questions/8362022/ext-tree-panel-automatic-height-in-extjs-4
                setTimeout(function () {
                    var innerElement = _tree.getEl().down('table.x-grid-table');
                    if (innerElement) {
                        _tree.setHeight(innerElement.getHeight());
                        _tree.setWidth(innerElement.getWidth());
                    }
                }, 1);
            }

            function onCheckboxChanged(node, checked, eOpts) {
                var layerData = node.raw;
                layerData.showOrHideLayer(layerData, checked, _map);
            }

            function onFilterBoxKeyup(event) {
                var text = _$filterInput.val();
                if (text === "") {
                    _tree.clearFilter();
                } else {
                    _tree.filterByText(text);
                }
                resize();
            }

            addSpinner();
        }

        return Ui;
    }
);