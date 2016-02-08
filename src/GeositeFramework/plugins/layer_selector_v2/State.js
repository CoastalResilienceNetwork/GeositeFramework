define([
        "dojo/_base/declare",
        "dojo/Evented",
        "dojo/Deferred",
        "esri/request",
        "underscore",
        "framework/util/ajax",
        "./util",
        "./LayerNode"
    ],
    function(declare,
             Evented,
             Deferred,
             request,
             _,
             ajaxUtil,
             util,
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

        // Return map service data for the corresponding layer.
        function getServiceData(layer) {
            return ajaxUtil.get(layer.getServiceUrl());
        }

        // Find the corresponding data for `layer` in the map service.
        function findServiceLayer(serviceData, layer) {
            if (!serviceData || !layer) {
                return null;
            }
            return _.find(serviceData.layers, function(serviceLayer) {
                if (layer.getName() === serviceLayer.name) {
                    // Compare not only the name, but the structure as well.
                    // Protects against an edge case where a map service
                    // contains a parent and child layer with the same name.
                    if (layer.hasChildren() && serviceLayer.subLayerIds) {
                        return true;
                    } else if (!layer.hasChildren() && !serviceLayer.subLayerIds) {
                        return true;
                    }
                }
                return false;
            });
        }

        function findServiceLayerById(serviceData, layerId) {
            if (!serviceData) {
                return null;
            }
            return _.findWhere(serviceData.layers, { id: layerId });
        }

        return declare([Evented], {
            constructor: function(config, data) {
                this.config = config;
                this.layers = this.coalesceLayers();
                this.savedState = _.defaults({}, data, {
                    // List of activated layer IDs (in-order).
                    selectedLayers: []
                });
            },

            // Combine config layer nodes with map service data.
            coalesceLayers: function() {
                return _.map(this.config.getLayers(), function(layer) {
                    return this.coalesceLayerNode(null, layer);
                }, this);
            },

            // Combine layer node objects with service data.
            coalesceLayerNode: function(parent, layer) {
                var serviceData = getServiceData(layer),
                    serviceLayer = findServiceLayer(serviceData, layer);

                var node = _.assign({}, layer.getData(), serviceLayer || {}),
                    result = new LayerNode(parent, node);

                // Include layers loaded on-demand (overrides layers defined in layers.json).
                if (serviceLayer && serviceLayer.subLayerIds) {
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
                var serviceData = getServiceData(parent),
                    serviceLayer = findServiceLayerById(serviceData, subLayerId),
                    result = new LayerNode(parent, serviceLayer);

                if (serviceLayer.subLayerIds) {
                    _.each(serviceLayer.subLayerIds, function(subLayerId) {
                        var childLayer = this.coalesceSubLayer(result, subLayerId);
                        result.addChild(childLayer);
                    }, this);
                }

                return result;
            },

            // Called every time a map service has been loaded, so that
            // `layers` always reflects the union of configuration data
            // and data fetched from map services.
            onLayerFetched: function() {
                this.layers = this.coalesceLayers();
                this.emit('update');
            },

            getLayers: function() {
                return this.layers;
            },

            findLayer: function(layerId) {
                return util.find(this.layers, function(layer) {
                    return layer.findLayer(layerId);
                });
            },

            getSelectedLayers: function() {
                var findLayer = _.bind(this.findLayer, this);
                return _.map(this.savedState.selectedLayers, this.findLayer, this);
            },

            clearAllLayers: function() {
                this.savedState.selectedLayers = [];
                this.emit('update');
            },

            isSelected: function(layerId) {
                return _.contains(this.savedState.selectedLayers, layerId);
            },

            toggleLayer: function(layerId) {
                if (this.isSelected(layerId)) {
                    this.deselectLayer(layerId);
                } else {
                    this.selectLayer(layerId);
                }
            },

            selectLayer: function(layerId) {
                this.savedState.selectedLayers.push(layerId);
                this.fetchLayerData(layerId);
                this.emit('update');
            },

            deselectLayer: function(layerId) {
                this.savedState.selectedLayers = _.without(this.savedState.selectedLayers, layerId);
                this.emit('update');
            },

            // Request layer data from map service in the background.
            fetchLayerData: function(layerId) {
                var layer = this.config.findLayer(layerId),
                    onLayerFetched = _.bind(this.onLayerFetched, this);

                // If `layerId` couldn't be located in `config`, it means
                // that it's probably a layer loaded on-demand, so there
                // is no need to fetch anything.
                if (!layer) {
                    return;
                }

                return fetch(layer).then(onLayerFetched);
            },

            serialize: function() {
                return this.savedState;
            }
        });
    }
);