define([
        "dojo/_base/declare",
        "underscore",
        "./util",
        "./LayerNode"
    ],
    function(declare,
             _,
             util,
             LayerNode) {
        "use strict";

        return declare(null, {
            constructor: function(config, state) {
                this.config = config;
                this.state = state;
                this.rebuildLayers();
            },

            rebuildLayers: function() {
                this.layers = this.coalesceLayers();
                this.layers = this.filterByRegion(this.layers, this.state.getCurrentRegion());
                this.layers = this.filterByName(this.layers, this.state.getFilterText());
            },

            // Combine config layer nodes with map service data.
            coalesceLayers: function() {
                return _.map(this.config.getLayers(), function(layer) {
                    return this.coalesceLayerNode(null, layer);
                }, this);
            },

            // Combine layer node objects with service data.
            coalesceLayerNode: function(parent, layer) {
                var service = layer.getService(),
                    serviceLayer = service.findServiceLayer(layer),
                    layerDetails = service.getLayerDetails(serviceLayer),
                    layerData = _.assign({}, serviceLayer || {}, layerDetails || {}, layer.getData()),
                    layerId = this.createLayerId(parent, layerData),
                    opacity = this.state.getLayerOpacity(layerId),
                    node = _.assign(layerData, {
                        uid: layerId,
                        isSelected: this.state.isSelected(layerId),
                        isExpanded: this.state.isExpanded(layerId),
                        infoIsDisplayed: this.state.infoIsDisplayed(layerId),
                        opacity: _.isNumber(opacity) ? opacity : layer.getOpacity()
                    }),
                    result = new LayerNode(node, parent);

                // Include layers loaded on-demand (overrides layers defined in layers.json).
                if (layer.includeAllLayers() && serviceLayer && serviceLayer.subLayerIds) {
                    _.each(serviceLayer.subLayerIds, function(subLayerId) {
                        var childLayer = this.coalesceSubLayer(result, subLayerId);
                        result.addChild(childLayer);
                    }, this);
                } else {
                    _.each(layer.getChildren(), function(child) {
                        var childLayer = this.coalesceLayerNode(result, child);
                        result.addChild(childLayer);
                    }, this);
                }

                return result;
            },

            // Wrap service data in layer node objects.
            coalesceSubLayer: function(parent, subLayerId) {
                var service = parent.getService(),
                    serviceLayer = service.findServiceLayerById(subLayerId),
                    layerDetails = service.getLayerDetails(serviceLayer),
                    layerData = _.assign({}, serviceLayer || {}, layerDetails || {}),
                    layerId = this.createLayerId(parent, layerData),
                    node = _.assign(layerData, {
                        uid: layerId,
                        isSelected: this.state.isSelected(layerId),
                        isExpanded: this.state.isExpanded(layerId),
                        infoIsDisplayed: this.state.infoIsDisplayed(layerId),
                        opacity: this.state.getLayerOpacity(layerId)
                    }),
                    result = new LayerNode(node, parent);

                if (serviceLayer.subLayerIds) {
                    _.each(serviceLayer.subLayerIds, function(subLayerId) {
                        var childLayer = this.coalesceSubLayer(result, subLayerId);
                        result.addChild(childLayer);
                    }, this);
                }

                return result;
            },

            // `node` should contain the minimum amount of information needed
            // to generate a unique layer ID (name & optionally displayName).
            createLayerId: function(parent, node) {
                // Default to `displayName` instead of `name` because not all layers
                // have names (ex. folder nodes).
                var displayName = node.displayName || node.name;
                if (parent) {
                    return parent.id() + '/' + displayName;
                }
               return displayName;
            },

            filterByRegion: function(layers, currentRegion) {
                return _.filter(_.map(layers, function(layer) {
                    if (!layer.isAvailableInRegion(currentRegion)) {
                        return null;
                    } else if (layer.isFolder()) {
                        var children = this.filterByRegion(layer.getChildren(), currentRegion);
                        if (children.length > 0) {
                            var result = new LayerNode(layer.node, layer.parent);
                            result.addChildren(children);
                            return result;
                        }
                        return null;
                    }
                    return layer;
                }, this));
            },

            filterByName: function(layers, filterText) {
                if (filterText.length === 0) {
                    return layers;
                }

                filterText = filterText.toLowerCase();

                return _.filter(_.map(layers, function(layer) {
                    if (!layer.isFolder()) {
                        return layer.getDisplayName().toLowerCase().indexOf(filterText) !== -1 ?
                            layer : null;
                    } else {
                        var children = this.filterByName(layer.getChildren(), filterText);
                        if (children.length > 0) {
                            var result = new LayerNode(layer.node, layer.parent);
                            result.addChildren(children);
                            return result;
                        }
                        return null;
                    }
                }, this));
            },

            getLayers: function() {
                return this.layers;
            },

            findLayer: function(layerId) {
                return util.find(this.layers, function(layer) {
                    return layer.findLayer(layerId);
                });
            },

            findLayers: function(layerIds) {
                return _.filter(_.map(layerIds, this.findLayer, this));
            },

            walk: function(callback) {
                _.invoke(this.layers, 'walk', callback);
            }
        });
    }
);
