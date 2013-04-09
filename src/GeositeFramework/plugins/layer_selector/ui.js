// Module Ui.js

require(["jquery.placeholder"]);
define(["jquery", "use!underscore", "use!extjs", "./treeFilter", "use!TinyBox2"],
    function ($, _, Ext, treeFilter, TINY) {
        //$('input, textarea').placeholder(); // initialize jquery.placeholder

        var Ui = function (container, map, templates) {
            var _map = map,
                _container = container,
                _$templates = $('<div>').append($(templates.trim())), // store templates in a utility div
                _$filterInput = null,
                _$treeContainer = null,
                _tree = null,
                _justClickedItemIcon = false;

            // ------------------------------------------------------------------------
            // Public methods

            this.render = function (rootNode) {
                sortFolders([rootNode]);
                _tree = createTree(rootNode);
                _tree.on("checkchange", onCheckboxChanged, this);
                _tree.on("afteritemexpand", onItemExpanded, this);
                _tree.on("itemclick", onItemClick, this);
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

            // ------------------------------------------------------------------------
            // Private methods

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
                // Each TreeStore node's "raw" property has a copy of the node it was created from,
                // but without the "children" property. Restore "children" so LayerManager can 
                // continue to traverse and modify the "raw" tree.
                restoreChildren(store.tree.root);

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

            function restoreChildren(cooked) {
                // 'cooked' is a TreeStore node, and 'cooked.raw' is the node it was created from.
                // Restore raw.children from cooked.ChildNodes, and recurse.
                if (cooked.childNodes.length > 0) {
                    cooked.raw.children = _.map(cooked.childNodes, function (cookedChild) {
                        return cookedChild.raw;
                    });
                    _.each(cooked.childNodes, function (cookedChild) {
                        restoreChildren(cookedChild);
                    });
                }
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

            function onItemExpanded(node, index, item, eOpts) {
                // A tree item was just expanded; enable icon click handlers in child items
                // (Using JQuery and a flag here because I can't see how to click-enable the icon via Ext)
                $/*(item).find*/('.x-tree-icon').off('click').on('click', function () {
                    // An icon was clicked; set flag for item click handler
                    _justClickedItemIcon = true;
                });
            }

            function onItemClick(extView, record, item, index, e, eOpts) {
                if (_justClickedItemIcon) {
                    if (record.raw.type === 'layer') {
                        var layer = 0;
                    } else if (record.raw.type === 'service') {
                        showLayerDialog(record);
                    }
                }
                _justClickedItemIcon = false;
            }

            function showLayerDialog(record) {
                var $dialog = $('.pluginLayerSelector-info-box').remove(), // remove old dialog if present
                    node = record.raw,
                    template = _.template(_$templates.find('#template-layer-info-box').html()),
                    html = template({ description: node.description }).trim(),
                    $container = $(_container),
                    position = $container.offset();
                position.left += $container.outerWidth() + 20;
                position.top -= parseInt($container.parent('.plugin-container').css('borderTopWidth')); // not sure why this is necessary

                $dialog = $(html).offset(position).appendTo($('body'));
                $dialog.find('.close').click(function () {
                    $dialog.remove();
                });

                new Ext.Slider({
                    width: "100%",
                    minValue: 0,
                    maxValue: 100,
                    //fieldLabel: 'Opacity',
                    value: node.opacity * 100,
                    plugins: new Ext.slider.Tip(),
                    listeners: {
                        changecomplete: function (slider, value) {
                            node.setOpacity(node, _map, value / 100);
                        }
                    },
                    renderTo: $dialog.find('.slider')[0]
                });
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