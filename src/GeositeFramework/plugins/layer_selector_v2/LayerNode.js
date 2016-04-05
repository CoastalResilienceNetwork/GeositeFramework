define([
        "dojo/_base/declare",
        "underscore",
        "esri/geometry/Extent",
        "./util",
        "./AgsService",
        "./WmsService",
        "./NullService"
    ],
    function(declare,
             _,
             Extent,
             util,
             AgsService,
             WmsService,
             NullService) {
        "use strict";

        var LAYER_ID_DELIM = '/';

        // This structure wraps each node in layers.json, preserving the
        // parent/child relationship to support property inheritance.
        var LayerNode = declare(null, {
            constructor: function(node, parent) {
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

            addChildren: function(layers) {
                _.each(layers, function(layer) {
                    this.addChild(layer);
                }, this);
            },

            canAddChild: function(layer) {
                var blacklist = this.getExcludedLayers();
                if (blacklist) {
                    return !_.contains(blacklist, layer.getName());
                }
                return this.includeAllLayers() ||
                    _.contains(this.getIncludedLayerNames(), layer.getName());
            },

            getChildren: function() {
                return this.children;
            },

            // Return true if layer should have children (even if they
            // haven't loaded yet).
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
                // Default to `displayName` instead of `name` because not
                // all layers have names (ex. folder nodes).
                var displayName = this.node.displayName || this.node.name;
                if (this.parent) {
                    return this.parent.id() + LAYER_ID_DELIM + displayName;
                }
               return displayName;
            },

            // Return layer ID defined in the map service.
            getServiceId: function() {
                return this.node.id;
            },

            getServer: function() {
                if (this.parent) {
                    // The current node value should take precedence over
                    // the parent node.
                    return _.assign({}, this.parent.getServer(), this.node.server);
                }
                return this.node.server;
            },

            getService: function() {
                var server = this.getServer();
                switch (server && server.type) {
                    case 'ags':
                        return new AgsService(server);
                    case 'wms':
                        return new WmsService(server);
                }
                return new NullService();
            },

            getReportDbLayerName: function() {
                var defaultValue = this.parent &&
                        this.parent.getReportDbLayerName() || '';
                return this.node.reportDbLayerName || defaultValue;
            },

            // Return all configured reports for this layer, NOT including
            // the report layer name.
            getReports: function() {
                var reports = this.parent && this.parent.getReports() || [];
                return reports.concat(this.node.reports || []);
            },

            // Return all configured reports for this layer, including
            // the report layer name.
            getReportLayers: function() {
                var server = this.getServer(),
                    reportDbPath = server && server.reportDbPath,
                    reportDbLayerName = this.getReportDbLayerName(),
                    reportLayer = reportDbPath + LAYER_ID_DELIM + reportDbLayerName,
                    reports = this.getReports();

                if (reportDbPath && reportDbLayerName) {
                    return _.map(reports, function(report) {
                        return _.assign({}, report, {
                            layer: reportLayer
                        });
                    });
                }

                return [];
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

            getDescription: function() {
                return this.node.description || '';
            },

            getExtent: function() {
                if (this.node.extent) {
                    return new Extent(this.node.extent);
                }

                return null;
            },

            includeAllLayers: function() {
                return this.node.includeAllLayers ||
                    // This may seem counter-intuitive, but *all* sublayers must
                    // be loaded in order to satisfy a blacklist. So the `excludeLayers`
                    // property can be thought of as a subset of `includeLayers`.
                    !!this.getExcludedLayers();
            },

            // Return names of layers to include.
            getIncludedLayers: function() {
                return this.node.includeLayers;
            },

            getIncludedLayerNames: function() {
                return _.pluck(this.getIncludedLayers(), 'name');
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
            },

            isAvailableInRegion: function(regionId) {
                if (this.parent && !this.parent.isAvailableInRegion(regionId)) {
                    return false;
                }
                if (_.isEmpty(this.node.availableInRegions)) {
                    return true;
                }
                return _.contains(this.node.availableInRegions, regionId);
            },

            isSelected: function() {
                return this.node.isSelected;
            },

            isExpanded: function() {
                return this.node.isExpanded;
            },

            infoIsDisplayed: function() {
                return this.node.infoIsDisplayed;
            },

            getOpacity: function() {
                return _.isNumber(this.node.opacity) ? this.node.opacity : 1;
            },

            getDownloadUrl: function() {
                return this.node.downloadUrl;
            }
        });

        // Recursively wraps each raw layer node with an instance of LayerNode.
        // `node` may represent a single layer from layers.json
        LayerNode.fromJS = function(node, parent) {
            var result = new LayerNode(node, parent);
            _.each(node.includeLayers || [], function(childNode) {
                result.addChild(LayerNode.fromJS(childNode, result));
            }, this);
            return result;
        };

        // Return path to each parent layer as an array.
        LayerNode.extractParentPaths = function(layerId) {
            // Split layerId into separate parts then
            // queue each part starting with the root node.
            // For example, a layerId like "A/B/C" should queue
            // "A", and "A/B".
            var result = [],
                parts = layerId.split(LAYER_ID_DELIM);

            for (var i = 0; i < parts.length - 1; i++) {
                result.push(parts.slice(0, i + 1).join(LAYER_ID_DELIM));
            }

            return result;
        };

        return LayerNode;
    }
);
