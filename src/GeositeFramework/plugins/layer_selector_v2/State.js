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

        var LAYERS_CHANGED = 'change:layers',
            SELECTED_LAYERS_CHANGED = 'change:selectedLayers',
            FILTER_CHANGED = 'change:filter';

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
                this.savedState = _.defaults({}, data, {
                    filterText: '',
                    // List of activated layer IDs (in-order).
                    selectedLayers: []
                });
                this.config = config;
                this.rebuildLayers();
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

            filterLayers: function(layers) {
                var searchTerm = this.savedState.filterText.trim().toLowerCase();

                // Include all leaf nodes that partially match `filterText` and
                // include all parent nodes that have at least one child.
                function filterLayer(layer) {
                    if (!layer.hasChildren()) {
                        return layer.getDisplayName().toLowerCase().indexOf(searchTerm) !== -1;
                    } else {
                        layer.children = _.filter(layer.children, filterLayer);
                        return layer.getChildren().length > 0;
                    }
                }

                if (searchTerm.length > 0) {
                    return _.filter(layers, filterLayer);
                } else {
                    return layers;
                }
            },

            // Called every time a map service has been loaded, so that
            // `layers` always reflects the union of configuration data
            // and data fetched from map services.
            rebuildLayers: function() {
                this.layers = this.coalesceLayers();
                // Unfortunately, we need to execute `coalesceLayers` twice because
                // `filterLayers` mutates the list of layers.
                this.filteredLayers = this.filterLayers(this.coalesceLayers());
                this.emit(LAYERS_CHANGED);
            },

            getLayers: function() {
                return this.filteredLayers;
            },

            findLayer: function(layerId) {
                return util.find(this.layers, function(layer) {
                    return layer.findLayer(layerId);
                });
            },

            getSelectedLayers: function() {
                var result = _.map(this.savedState.selectedLayers, this.findLayer, this);
                result = _.filter(result, function(layer) {
                    // Only allow leaf nodes to be added to the map, for now.
                    return !layer.hasChildren() &&
                        this.allParentsSelected(layer.id());
                }, this);
                return result;
            },

            clearAllLayers: function() {
                this.filterTree('');
                this.setSelectedLayers([]);
            },

            isSelected: function(layerId) {
                return _.contains(this.savedState.selectedLayers, layerId);
            },

            // Return true if the target layer and all of its parent nodes are selected.
            allParentsSelected: function(layerId) {
                var layer = this.findLayer(layerId);
                if (layer) {
                    if (layer.parent) {
                        return this.isSelected(layerId) && this.allParentsSelected(layer.parent.id());
                    } else {
                        return this.isSelected(layerId);
                    }
                }
                return false;
            },

            toggleLayer: function(layerId) {
                if (this.isSelected(layerId)) {
                    this.deselectLayer(layerId);
                } else {
                    this.selectLayer(layerId);
                }
            },

            selectLayer: function(layerId) {
                var selectedLayers = this.savedState.selectedLayers.concat(layerId);
                this.setSelectedLayers(selectedLayers);
                this.fetchLayerData(layerId);
            },

            deselectLayer: function(layerId) {
                var selectedLayers = _.without(this.savedState.selectedLayers, layerId);
                this.setSelectedLayers(selectedLayers);
            },

            setSelectedLayers: function(selectedLayers) {
                this.savedState.selectedLayers = selectedLayers;
                this.emit(SELECTED_LAYERS_CHANGED);
            },

            // Request layer data from map service in the background.
            fetchLayerData: function(layerId) {
                var layer = this.config.findLayer(layerId),
                    rebuildLayers = _.bind(this.rebuildLayers, this);

                // If `layerId` couldn't be located in `config`, it means
                // that it's probably a layer loaded on-demand, so there
                // is no need to fetch anything.
                if (!layer) {
                    return;
                }

                return fetch(layer).then(rebuildLayers);
            },

            getFilterText: function() {
                return this.savedState.filterText;
            },

            filterTree: function(filterText) {
                this.savedState.filterText = filterText;
                this.emit(FILTER_CHANGED);
                this.rebuildLayers();
            },

            serialize: function() {
                return this.savedState;
            }
        });
    }
);