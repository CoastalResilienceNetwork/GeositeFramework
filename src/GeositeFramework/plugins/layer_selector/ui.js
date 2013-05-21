// Module Ui.js

require(["jquery.placeholder"]);
define(["jquery", "use!underscore", "use!extjs", "./treeFilter"],
    function ($, _, Ext, treeFilter, TINY) {
        //$('input, textarea').placeholder(); // initialize jquery.placeholder

        var Ui = function (container, map, templates) {
            var _map = map,
                _container = container,
                _$templates = $('<div>').append($($.trim(templates))), // store templates in a utility div
                _$filterInput = null,
                _$treeContainer = null,
                _$layerDialog = null,
                _tree = null,
                _treeNeedsRendering = true,
                _justClickedItemIcon = false;

            // ------------------------------------------------------------------------
            // Public methods

            this.render = function (rootNode) {
                $(_container).empty();

                rootNode = deracinate(rootNode);
                _tree = createTree(rootNode);
                _tree.on("checkchange", onCheckboxChanged, this);
                _tree.on("afteritemexpand", onItemExpanded, this);
                _tree.on("itemclick", onItemClick, this);
                removeSpinner();
                renderUi();
                this.display();
            }

            this.display = function () {
                if (_tree) {
                    displayExtTree();
                }
                if (_$filterInput) {
                    _$filterInput.focus();
                }
                if (_$layerDialog) {
                    _$layerDialog.show();
                }
            }

            this.hideAll = function () {
                if (_$layerDialog) {
                    _$layerDialog.hide();
                }
            }

            // ------------------------------------------------------------------------
            // Private methods

            function deracinate(rootNode, depth) {
                /*
                  Takes a tree and checks to see if the root node only
                  has one child. If so, it promotes the child of the
                  rootNode to the new rootNode, discarding the previous
                  rootNode.
                  
                  This is done in order to avoid forcing the user to
                  click into multiple generations of a tree to get to
                  the services they want to use.
                 */
                if (rootNode.children && rootNode.children.length === 1) {
                    return rootNode.children[0];
                } else {
                    return rootNode;
                }
            }


            function displayExtTree () {
                if ($(_container).is(":visible") && _treeNeedsRendering) {
                    _tree.render(_$treeContainer[0]);
                    // // TODO this is a quirk. If we set this to false,
                    // // the tree won't load properly in all cases, because it is
                    // // tricky to predict how many times this method will be called
                    // // depending on the runmode. So, setting treeneedsrendering to false
                    // // will clear the UI and not rerender if this is the second call.
                    // // on the other hand, if we set this to true, we get this persistent EXT
                    // // error: 
                    // // Uncaught TypeError: Cannot call method 'writeTo' of null 
                    // //
                    // _treeNeedsRendering = false;
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
                        showLayerDialog();
                        if (node.fetchDescription) {
                            node.fetchDescription(node, function () {
                                fillLayerDialog(node);
                            });
                        } else {
                            fillLayerDialog(node);
                        }
                    }
                    _justClickedItemIcon = false;
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
                _$layerDialog = $(template()).offset(position).appendTo($('body'));
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
