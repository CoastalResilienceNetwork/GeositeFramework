﻿// Module Ui.js

require(["jquery.placeholder"]);
define(["jquery", "use!underscore", "use!extjs", "./treeFilter"],
    function ($, _, Ext, treeFilter) {
        //$('input, textarea').placeholder(); // initialize jquery.placeholder

        var Ui = function (container, map, templates) {
            var _map = map,
                _container = container,
                _$templates = $('<div>').append($($.trim(templates))), // store templates in a utility div
                _$filterInput = null,
                _$treeContainer = null,
                _$layerDialog = null,
                _store = null,
                _tree = null,
                _treeRootNode = null,
                _justClickedItemIcon = false,
                _justClickedZoomIcon = false,
                _isRendered = false,

                renderExtTree;
            // ------------------------------------------------------------------------
            // Public methods

            this.render = function (rootNode) {
                $(_container).empty();

                // Avoid deracinating the root node, because if there is only 1 layer
                // in the layer selector it will become the new root node, and
                // the tree will appear empty since we do not render the tree root.
                rootNode.children = _.map(rootNode.children, deracinate);

                highlightNewNodes(rootNode);
                addZoomButtons(rootNode);
                addDownloadButtons(rootNode);
                wrapText(rootNode);
                _store = createTreeStore(rootNode);
                _tree = createTree(_store);
                _treeRootNode = rootNode;
                _tree.on("checkchange", onCheckboxChanged, this);
                _tree.on("afteritemexpand", onItemExpanded, this);
                _tree.on("itemclick", onItemClick, this);
                removeSpinner();
                renderUi();
                _isRendered = true;
                this.display();
            };

            this.cleanUp = function() {
                if (_tree) {
                    _tree.destroy();
                    delete _tree;
                }
            }

            this.isRendered = function() {
                return _isRendered;
            }

            this.display = function () {
                renderExtTree();
                syncUI();

                if (_$filterInput) {
                    _$filterInput.focus();
                }
                if (_$layerDialog) {
                    _$layerDialog.show();
                }
               
                // Size to contents of window when displaying
                // the form initially.  If it was resized while
                // the container was hidden, w/h are equal to 0
                this.onContainerSizeChanged();

                enableIconClick();
            };

            this.hideAll = function () {
                if (_$layerDialog) {
                    _$layerDialog.hide();
                }
            };

            this.uncheckAndCollapse = function () {
                _tree.collapseAll();
                _store.getRootNode().cascadeBy(function() {
                    this.set('checked', false);
                });
                onContentSizeChanged();
            };

            this.onContainerSizeChanged = function (dx, dy) {
                // The ExtJS TreePanel can't /be sized to fit its widest element, 
                // nor can you discover those widths programatically.
                // So we let users reveal more by resizing the container,
                // setting here the tree panel width to the container's width.
                setTreeWidthToContainerWidth();
                onContentSizeChanged();
            };

            // ------------------------------------------------------------------------
            // Private methods

            function deracinate(rootNode) {
                /*
                  Takes a tree and checks to see if the root node only
                  has one child. If so, it promotes the child of the
                  rootNode to the new rootNode, discarding the previous
                  rootNode.
                  
                  This is done in order to avoid forcing the user to
                  click into multiple generations of a tree to get to
                  the services they want to use.
                 */
                /* if (rootNode.children && rootNode.children.length === 1) {
                    return rootNode.children[0];
                } else {
                    return rootNode;
                } */
				
				return rootNode;
            }

            function addZoomButtons(node) {
                if (node.leaf) {
                    node.text += ' <span class="pluginLayer-extent-zoom"></span>';
                }
                _.each(node.children, function (child) {
                    addZoomButtons(child);
                });
            }

            function addDownloadButtons(node) {
                if (node.downloadUrl) {
                    node.text += ' <a href="' + node.downloadUrl + '" class="pluginLayer-download" target="_blank"></a>';
                }
                _.each(node.children, function (child) {
                    addDownloadButtons(child);
                });
            }

            // Wrap each node text value in a span tag.
            function wrapText(node) {
                node.text = '<span class="text">' + node.text + '</span>';
                _.each(node.children, function(child) {
                    wrapText(child);
                });
            }

            function highlightNewNodes(node, parentIsNew, newLayerIds) {
                var isNew = parentIsNew;
                if (!parentIsNew) {
                    if (newLayerIds && _.contains(newLayerIds, node.layerId)) {
                        isNew = true;
                    } else if (node.isNew) {
                        var start = Date.parse(node.isNew.startDate),
                            end = new Date(Date.parse(node.isNew.endDate)),
                            now = Date.now();
                        end.setDate(end.getDate() + 1);
                        if (now > start && now < end) {
                            if (node.isNew.layerIds) {
                                newLayerIds = node.isNew.layerIds;
                            } else {
                                isNew = true;
                            }
                        }
                    }
                    if (isNew) {
                        for (var ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
                            highlightNode(ancestor);
                        }
                    }
                }
                if (isNew) {
                    highlightNode(node);
                }
                _.each(node.children, function (child) {
                    highlightNewNodes(child, isNew, newLayerIds);
                });

                function highlightNode(n) {
                    n.cls += ' pluginLayerSelector-new';
                }
            }

            renderExtTree = (function () {
                var renderExtTreeCount = 0;
                return function () {
                    if (_tree && $(_container).is(":visible") && renderExtTreeCount === 0) {
                        setTreeWidthToContainerWidth();
                        _tree.render(_$treeContainer[0]);
                        renderExtTreeCount++;
                    }
                };
            }());

            function setTreeWidthToContainerWidth() {
                if (_tree) {
                    _tree.setWidth($(_container).width());
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
                var template = getTemplate('template-layer-selector'),
                    $template = $(template());
                $template.find('input').keyup(onFilterBoxKeyup);
                $(_container).append($template);
                _$filterInput = $template.find('input');
                _$treeContainer = $template.find('.pluginLayerSelector-tree-container');
            }

            function getTemplate(name) {
                var template = _.template($.trim(_$templates.find('#' + name).html()));
                return template;
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

            function createTreeStore(rootNode) {
                var store = Ext.create('Ext.data.TreeStore', {
                    root: rootNode,
                    fields: ['text', 'name', 'leaf', 'cls', 'url', 'layerId']
                });
                // Each TreeStore node's "raw" property has a copy of the node it was created from,
                // but without the "children" property. Restore "children" so LayerManager can 
                // continue to traverse and modify the "raw" tree.
                restoreChildren(store.tree.root);
                return store;
            }

            function createTree(store) {
                var tree = Ext.create('FilteredTreePanel', {
                    store: store,
                    rootVisible: false,
                    animate: false,
                    scroll: false,
                    border: false,
                    width: $(_container).width(),
                    listeners: {
                        load: onContentSizeChanged,
                        itemexpand: onContentSizeChanged,
                        itemcollapse: onContentSizeChanged
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

            function onContentSizeChanged() {
                // Set size of tree element using size of expanded tree nodes, via hack from 
                // http://stackoverflow.com/questions/8362022/ext-tree-panel-automatic-height-in-extjs-4
                // This makes the plugin panel's scrollbar work correctly.
                // It also truncates too-wide tree node labels (adding "...").
                _.defer(function () {
                    var el = _tree && _tree.getEl();
                    if (!el) { return; }

                    var innerElement = el.down('table.x-grid-table');
                    if (innerElement) {
                        _tree.setHeight(innerElement.getHeight());
                        _tree.setWidth(innerElement.getWidth());
                    }
                });
            }

            function onCheckboxChanged(node, checked, eOpts) {
                node.raw.showOrHideLayer(node, checked, _map);
                node.raw.checked = checked;
                if (node.hasChildNodes()) {
                    if (!node.isExpanded() && node.get('checked')) {
                        node.expand();
                    }
                }
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
                
                $('.pluginLayer-extent-zoom').off('click').on('click', function () {
                    // extent icon was clicked -- set flag for item click handler
                    _justClickedZoomIcon = true;
                });
            }

            function onItemClick(extView, record, item, index, e, eOpts) {
                // User has clicked somewhere on a tree item row.
                // Only proceed if they clicked one of the item's icon.
                var node = record.raw;

                if (_justClickedItemIcon) {
                    loadDescription();
                } else if (_justClickedZoomIcon) {
                    loadExtent();
                }

                function loadDescription() {
                    if (node.description || node.fetchMetadata) {
                        if (node.fetchMetadata) {
                            node.fetchMetadata(node, function () {
                                showDialog(node);
                            });
                        } else {
                            showDialog(node);
                        }
                    }
                    _justClickedItemIcon = false;
                }

                function loadExtent() {
                    if (node.extent || node.fetchMetadata) {
                        if (node.fetchMetadata) {
                            node.fetchMetadata(node, function() {
                                _map.setExtent(node.extent);
                            });
                        } else {
                            _map.setExtent(node.extent);
                        }
                        _justClickedZoomIcon = false;
                    }
                }

                function showDialog() {
                    showLayerDialog();
                    fillLayerDialog(node);
                }
            }

            function showLayerDialog() {
                removeLayerDialog() // remove old dialog if present
                var template = getTemplate('template-layer-info-box'),
                    $container = $(_container),
                    position = $container.offset();
                // Position dialog next to layer selector UI
                position.left += $container.outerWidth() + 20;
                position.top -= parseInt($container.parent('.plugin-container').css('borderTopWidth')); // not sure why this is necessary
                _$layerDialog = $(template()).appendTo($('body')).offset(position);
                _$layerDialog.find('.close').click(function () {
                    removeLayerDialog();
                });
            }

            function removeLayerDialog() {
                if (_$layerDialog) {
                    _$layerDialog.remove();
                    _$layerDialog = null;
                }
            }

            function fillLayerDialog(node) {
                if (node.description) {
                    var $description = _$layerDialog.find('.description').show().find('.info-value');
                    $description.html(node.description);
                }
                if (node.setOpacity) {
                    new Ext.Slider({
                        width: "100%",
                        minValue: 0,
                        maxValue: 100,
                        value: node.opacity * 100,
                        plugins: new Ext.slider.Tip(),
                        listeners: {
                            change: function (slider, value) {
                                node.setOpacity(node, _map, value / 100);
                            }
                        },
                        renderTo: _$layerDialog.find('.opacity').show().find('.info-value')[0]
                    });
                //} else if (node.opacity === "setByService") {
                //    _$layerDialog.find('.opacity').show().find('.info-value').text("Set opacity for all layers in this group by clicking on the group's info button.");
                }
                _$layerDialog.find('.pluginLayerSelector-spinner').hide();
            }
            
            function onFilterBoxKeyup(event) {
                var text = _$filterInput.val();
                if (text === "") {
                    _tree.clearFilter();
                } else {
                    _tree.filterByText(text);
                }
                onContentSizeChanged();
            }

            function syncUI() {
                if (_store) {
                    var nodesByName = flattenTree(_treeRootNode);
                    _store.getRootNode().cascadeBy(function(treeNode) {
                        var layerName = treeNode.get('name'),
                            uniqueName = layerName + _.pluck(treeNode.raw.children, 'layerId').join('.'),
                            dataNode = nodesByName[uniqueName];

                        if (dataNode) {
                            if (!!dataNode.expanded) {
                                treeNode.expand();
                            } else {
                                treeNode.collapse();
                            }

                            if (dataNode.checked === true) {
                                treeNode.set('checked', true);
                            }

                            if (dataNode.visibleLayerIds) {
                                _.each(treeNode.childNodes, function(childNode) {
                                    if (_.contains(dataNode.visibleLayerIds, childNode.get('layerId'))) {
                                        childNode.set('checked', true);
                                    }
                                });
                            }
                        }
                    });
                }
            }

            // Flatten hierarchy of nodes into a flat list indexed by name.
            function flattenTree(node) {
                var result = {};
                if (node.name) {
                    var unq = _.pluck(node.children, 'layerId').join('.');
                    result[node.name + unq] = node;
                }
                return _.reduce(node.children, function(acc, childNode) {
                    return _.extend(acc, flattenTree(childNode));
                }, result);
            }

            addSpinner();
        };

        return Ui;
    }
);
