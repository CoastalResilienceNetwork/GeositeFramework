/**
 * Add basic filtering to Ext.tree.Panel. Add as a mixin:
 *  mixins: {
 *      treeFilter: 'layer_selector.lib.TreeFilter'
 *  }
 *
 * Slightly modified version of https://gist.github.com/colinramsay/1789536
 */
define(["use!extjs"],
    function (Ext) {

        Ext.define('layer_selector.lib.TreeFilter', {
            filterByText: function (text) {
                this.filterBy(text, 'text');
            },


            /**
             * Filter the tree on a string, hiding all nodes except those which match and their parents.
             * @param The term to filter on.
             * @param The field to filter on (i.e. 'text').
             */
            filterBy: function (text, by) {

                Ext.suspendLayouts();
                this.clearFilter();

                var view = this.getView(),
                    me = this,
                    nodesAndParents = [];

                // Find the nodes which match the search term, expand them.
                // Then add them and their parents to nodesAndParents.
                this.getRootNode().cascadeBy(function (tree, view) {
                    var currNode = this;

                    if (currNode && currNode.data[by] && currNode.data[by].toString().toLowerCase().indexOf(text.toLowerCase()) > -1) {
                        while (currNode.parentNode) {
                            nodesAndParents.push(currNode.id);
                            currNode = currNode.parentNode;
                            currNode.expand();
                        }
                    }
                }, null, [me, view]);

                // Hide all of the nodes which aren't in nodesAndParents
                this.getRootNode().cascadeBy(function (tree, view) {
                    var uiNode = view.getNodeByRecord(this);

                    if (uiNode && !Ext.Array.contains(nodesAndParents, this.id)) {
                        Ext.get(uiNode).setDisplayed('none');
                    }
                }, null, [me, view]);

                Ext.resumeLayouts(true);
            },


            clearFilter: function () {
                var view = this.getView();

                this.getRootNode().cascadeBy(function (tree, view) {
                    var uiNode = view.getNodeByRecord(this);

                    if (uiNode) {
                        Ext.get(uiNode).setDisplayed('table-row');
                    }
                }, null, [this, view]);
            }
        });

    }
);
