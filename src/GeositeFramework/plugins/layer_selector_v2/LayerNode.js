define([
        "dojo/_base/declare",
        "underscore",
        "./util"
    ],
    function(declare,
             _,
             util) {
        "use strict";

        // This structure wraps each node in layers.json, preserving the
        // parent/child relationship to support property inheritance.
        return declare(null, {
            constructor: function(parent, node) {
                this.node = node;
                this.parent = parent;
                this.children = [];
            },

            getData: function() {
                return this.node;
            },

            addChild: function(layerNode) {
                if (!_.contains(this.excludeLayers(), layerNode.getName())) {
                    this.children.push(layerNode);
                }
            },

            getChildren: function() {
                return this.children;
            },

            // Return true if layer should have children (even if they haven't loaded yet).
            hasChildren: function() {
                return this.children.length > 0 ||
                    this.node.includeAllLayers ||
                    !!this.node.excludeLayers;
            },

            // Return full path to leaf node in the tree.
            id: function() {
                if (this.parent) {
                    return this.parent.id() + '/' + this.getDisplayName();
                }
                // Use "display name" instead of "name" because not all layers
                // have names (ex. folder nodes).
                return this.getDisplayName();
            },

            // Return layer ID defined in the map service.
            getServiceId: function() {
                return this.node.id;
            },

            getServer: function() {
                if (this.parent) {
                    // The current node value should take precedence over the parent node.
                    return _.assign({}, this.parent.getServer(), this.node.server);
                }
                return this.node.server;
            },

            getServiceUrl: function() {
                var server = this.getServer();
                if (server && server.url && server.name) {
                    return util.urljoin(server.url, server.name, 'MapServer');
                }
                return null;
            },

            findLayer: function(layerId) {
                if (layerId === this.id()) {
                    return this;
                }
                return util.find(this.children, function(layer) {
                    return layer.findLayer(layerId);
                });
            },

            getName: function() {
                return this.node.name;
            },

            getDisplayName: function() {
                return this.node.displayName || this.node.name;
            },

            includeAllLayers: function() {
                return this.node.includeAllLayers;
            },

            excludeLayers: function() {
                return this.node.excludeLayers;
            },

            isFolder: function() {
                // If there is no valid service URL this is probably a "folder" node.
                return !this.getServiceUrl();
            }
        });
    }
);