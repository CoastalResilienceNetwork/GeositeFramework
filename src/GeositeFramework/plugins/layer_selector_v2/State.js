define([
        "dojo/_base/declare",
        "dojo/Evented",
        "dojo/Deferred",
        "esri/request",
        "underscore",
        "framework/util/ajax",
        "./LayerNode"
    ],
    function(declare,
             Evented,
             Deferred,
             request,
             _,
             ajaxUtil,
             LayerNode) {
        "use strict";

        // Fetch layer data and return promise.
        function fetch(layer) {
            if (layer.isFolder()) {
                return new Deferred().resolve();
            } else {
                return ajaxUtil.fetch(layer.getServiceUrl());
            }
        }

        // Return true if layer data has been fetched.
        function isLoaded(layer) {
            if (layer.isFolder()) {
                return true;
            } else {
                return ajaxUtil.isCached(layer.getServiceUrl());
            }
        }

        return declare([Evented], {
            constructor: function(config, data) {
                this.config = config;
                // Contains any data that may be serialized/deserialized.
                // Any state that is required to render the present condition
                // of the layer selector plugin should be stored here.
                this.data = _.defaults({}, data, {
                    // List of activated layer IDs (in-order).
                    selectedLayers: []
                });
            },

            getSelectedLayers: function() {
                var findLayer = _.bind(this.config.findLayer, this.config);
                return _.map(this.data.selectedLayers, findLayer);
            },

            clearAllLayers: function() {
                this.data.selectedLayers = [];
                this.emit('update');
            },

            isSelected: function(layerId) {
                return _.contains(this.data.selectedLayers, layerId);
            },

            toggleLayer: function(layerId) {
                if (this.isSelected(layerId)) {
                    this.deselectLayer(layerId);
                } else {
                    this.selectLayer(layerId);
                }
            },

            selectLayer: function(layerId) {
                this.data.selectedLayers.push(layerId);
                this.fetchLayer(layerId);
                this.emit('update');
            },

            deselectLayer: function(layerId) {
                this.data.selectedLayers = _.without(this.data.selectedLayers, layerId);
                this.emit('update');
            },

            // Request layer data from map service in the background and
            // emit an 'update' event when it completes.
            fetchLayer: function(layerId) {
                var self = this,
                    layer = this.config.findLayer(layerId);

                // If `layerId` couldn't be located in the config it means
                // this is probably a layer loaded on-demand so there is
                // nothing to fetch in this case.
                if (!layer) {
                    return;
                }

                return fetch(layer).then(function() {
                    self.emit('update');
                });
            },

            // Return child layers that were loaded on-demand for a given layer.
            getChildren: function(layer) {
                if (!layer.hasChildren()) {
                    return [];
                } else if (layer.getChildren().length > 0) {
                    return layer.getChildren();
                }
                // If the layer *should* have children, but has none, it probably
                // means we need to load them on-demand from the map service.
                return this.getChildrenFromService(layer);
            },

            // Return layer children from map service (if it's loaded).
            getChildrenFromService: function(layer) {
                var serviceData = this.getServiceData(layer),
                    serviceLayer = this.findServiceLayer(serviceData, layer);
                if (serviceData && serviceLayer && serviceLayer.subLayerIds) {
                    var subLayers = _.map(serviceLayer.subLayerIds, function(subLayerId) {
                        return _.findWhere(serviceData.layers, {
                            id: subLayerId
                        });
                    });

                    if (layer.includeAllLayers()) {
                        // We don't actually have to do anything for this case
                        // since all sublayers are included by default.
                    } else if (layer.excludeLayers()) {
                        // Filter out blacklisted layers.
                        subLayers = _.filter(subLayers, function(subLayer) {
                            return !_.contains(layer.excludeLayers(), subLayer.name);
                        });
                    }

                    var blacklist = layer.excludeLayers() || [];
                    return _.reduce(subLayers, function(acc, subLayer) {
                        if (!_.contains(blacklist, subLayer.name)) {
                            return acc.concat(this.createLayerNode(serviceData, layer, subLayer));
                        }
                        return acc;
                    }, [], this);
                }
                return [];
            },

            createLayerNode: function(serviceData, parent, node) {
                var self = this,
                    layer = new LayerNode(parent, node);
                _.each(node.subLayerIds || [], function(childId) {
                    var childNode = _.findWhere(serviceData.layers, { id: childId }),
                        childLayer = self.createLayerNode(serviceData, layer, childNode);
                    layer.addChild(childLayer);
                });
                return layer;
            },

            // Return map service data for the corresponding layer.
            getServiceData: function(layer) {
                return ajaxUtil.get(layer.getServiceUrl());
            },

            // Find the corresponding data for `layer` in the map service.
            findServiceLayer: function(serviceData, layer) {
                if (!serviceData || !layer) {
                    return null;
                }
                return _.find(serviceData.layers, function(serviceLayer) {
                    if (layer.getName() === serviceLayer.name) {
                        // Compare not only the name, but the structure as well,
                        // to protect against an edge case where a map service
                        // contains a parent and child layer with the same name.
                        if (layer.hasChildren() && serviceLayer.subLayerIds) {
                            return true;
                        } else if (!layer.hasChildren() && !serviceLayer.subLayerIds) {
                            return true;
                        }
                    }
                    return false;
                });
            },

            serialize: function() {
                return this.data;
            }
        });
    }
);