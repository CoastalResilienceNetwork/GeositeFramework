// Module Ui.js

require(["jquery.placeholder"]);
define(["jquery", "use!underscore", "use!extjs", "./treeFilter"],
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
                enableIconClick();
            }

            function onItemExpanded(node, index, item, eOpts) {
                enableIconClick();
            }

            function enableIconClick() {
                // Enable icon click handlers
                // (Using JQuery and a flag here because I can't see how to click-enable the icon via Ext)
                $('.x-tree-icon').off('click').on('click', function () {
                    // An icon was clicked -- set flag for item click handler
                    _justClickedItemIcon = true;
                });
            }

            function onItemClick(extView, record, item, index, e, eOpts) {
                // User has clicked somewhere on a tree item row. Only proceed if they clicked the item's icon.
                if (_justClickedItemIcon) {
                    var node = record.raw;
                    if (node.description || node.fetchDescription) {
                        var $dialog = showLayerDialog();
                        if (node.fetchDescription) {
                            node.fetchDescription(node, function () {
                                fillLayerDialog($dialog, node);
                            });
                        } else {
                            fillLayerDialog($dialog, node);
                        }
                    }
                    _justClickedItemIcon = false;
                }
            }

            function showLayerDialog() {
                var $dialog = $('.pluginLayerSelector-info-box').remove(), // remove old dialog if present
                    template = _.template(_$templates.find('#template-layer-info-box').html()),
                    html = template().trim(),
                    $container = $(_container),
                    position = $container.offset();
                // Position dialog next to layer selector UI
                position.left += $container.outerWidth() + 20;
                position.top -= parseInt($container.parent('.plugin-container').css('borderTopWidth')); // not sure why this is necessary
                $dialog = $(html).offset(position).appendTo($('body'));
                $dialog.find('.close').click(function () {
                    $dialog.remove();
                });
                return $dialog;
            }

            function fillLayerDialog($dialog, node) {
                if (node.description) {
                    var $description = $dialog.find('.description').show().find('.info-value');
                    $description.html(node.description);
                    if (node.url) {
                        fixRelativeLinks($description, node.url);
                    }
                }
                if (node.setOpacity) {
                    new Ext.Slider({
                        width: "100%",
                        minValue: 0,
                        maxValue: 100,
                        value: node.opacity * 100,
                        plugins: new Ext.slider.Tip(),
                        listeners: {
                            changecomplete: function (slider, value) {
                                node.setOpacity(node, _map, value / 100);
                            }
                        },
                        renderTo: $dialog.find('.opacity').show().find('.info-value')[0]
                    });
                } else if (node.opacity === "setByService") {
                    $dialog.find('.opacity').show().find('.info-value').text("Set opacity for all layers in this group by clicking on the group's info button.");
                }
                $dialog.find('.pluginLayerSelector-spinner').hide();
            }

            function fixRelativeLinks($element, sourceUrl) {
                // ArcGIS Server "Description" html contains relative links, apparently assuming 
                // the ArcGIS Server is the same machine as the Web server.
                // That's not true for us, so for links whose hostname is empty we substitute the hostname from "sourceUrl".
                var sourceUrlAsLink = $('<a>', { href: sourceUrl })[0],
                    hostname = sourceUrlAsLink.hostname,
                    port = sourceUrlAsLink.port || 80;
                _.each($element.find('a'), function (link) {
                    if (!link.hostname || link.baseURI.indexOf(link.origin) === 0) {
                        link.hostname = hostname;
                        link.port = port;
                    }
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