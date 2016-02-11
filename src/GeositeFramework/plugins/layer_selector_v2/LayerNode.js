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
                return 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris pharetra aliquam nunc vel malesuada. Nunc ultricies laoreet ipsum, vel aliquam mi maximus vitae. Quisque consequat eros orci, nec porta purus suscipit nec. Nulla sed tincidunt ipsum. Etiam in sem viverra, aliquet lacus sed, lobortis purus. Suspendisse accumsan, lectus eu commodo malesuada, erat turpis blandit massa, quis fringilla tellus sem non augue. Integer non mauris non lacus ultricies euismod. Pellentesque eget molestie metus. Proin sem mi, vulputate id orci ac, laoreet euismod justo. Nunc eu placerat ex, vitae semper dui. Etiam tristique lorem quis iaculis luctus. Mauris quis hendrerit quam, in sodales urna. Quisque posuere vel nunc ac fringilla. In hac habitasse platea dictumst. Phasellus nibh lectus, congue sit amet leo efficitur, malesuada faucibus quam. Nullam velit sapien, pharetra et elit quis, convallis vehicula lectus.';
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