define([
        "dojo/_base/declare",
        "underscore",
        "esri/geometry/Extent",
        "./util"
    ],
    function(declare,
             _,
             Extent,
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

            addChild: function(layer) {
                if (this.canAddChild(layer)) {
                    this.children.push(layer);
                }
            },

            canAddChild: function(layer) {
                var blacklist = this.getExcludedLayers();
                if (blacklist) {
                    return !_.contains(blacklist, layer.getName());
                }
                return this.includeAllLayers() ||
                    _.contains(this.getIncludedLayers(), layer.getName());
            },

            getChildren: function() {
                return this.children;
            },

            // Return true if layer should have children (even if they haven't loaded yet).
            hasChildren: function() {
                return this.children.length > 0 ||
                    !!this.getExcludedLayers() ||
                    this.includeAllLayers();
            },

            // Depth-first node traversal.
            walk: function(callback) {
                callback(this);
                _.invoke(this.children, 'walk', callback);
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

            getInfo: function() {
                return this.node.description || '';
            },

            getExtent: function() {
                if (this.node.extent) {
                    return new Extent(this.node.extent);
                }

                return null;
            },

            includeAllLayers: function() {
                return this.node.includeAllLayers;
            },

            // Return names of layers to include.
            getIncludedLayers: function() {
                return _.pluck(this.node.includeLayers, 'name');
            },

            // Return names of layers to exclude.
            getExcludedLayers: function() {
                return this.node.excludeLayers;
            },

            isFolder: function() {
                return this.hasChildren() && !this.isCombined();
            },

            isCombined: function() {
                return this.node.combine;
            }
        });
    }
);