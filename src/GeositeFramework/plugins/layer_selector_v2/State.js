define([
        "dojo/_base/declare",
        "dojo/Deferred",
        "esri/request",
        "underscore",
        "framework/PausableEvented",
        "framework/util/ajax",
        "./util",
        "./LayerNode"
    ],
    function(declare,
             Deferred,
             request,
             _,
             PausableEvented,
             ajaxUtil,
             util,
             LayerNode) {
        "use strict";

        var LAYERS_CHANGED = 'change:layers',
            SELECTED_LAYERS_CHANGED = 'change:selectedLayers',
            FILTER_CHANGED = 'change:filter',
            EVERYTHING_CHANGED = 'change:all';

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

        function getLayerDetails(layer, layerId) {
            if (!layer || !layerId) { return; }

            var url = util.urljoin(layer.getServiceUrl(), layerId);

            return ajaxUtil.get(url);
        }

        return declare([PausableEvented], {
            constructor: function(config, data) {
                this.savedState = _.defaults({}, data, {
                    filterText: '',
                    // Selected layerIds (in-order).
                    selectedLayers: [],
                    // Expanded layerIds.
                    expandedLayers: []
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
                    serviceLayer = findServiceLayer(serviceData, layer),
                    layerServiceId = layer.getServiceId();

                // Layers not loaded on-demand don't have a service Id until after
                // this function completes, so we have to manually get the ID.
                if (!layer.getServiceId() && serviceData) {
                    layerServiceId = this.getServiceIdForLayer(layer);
                }

                var layerDetails = getLayerDetails(layer, layerServiceId),
                    node = _.assign({}, serviceLayer || {}, layerDetails || {}, layer.getData()),
                    result = new LayerNode(parent, node);

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
                var serviceData = getServiceData(parent),
                    serviceLayer = findServiceLayerById(serviceData, subLayerId),
                    layerDetails = getLayerDetails(parent, subLayerId);

                var node = _.assign({}, serviceLayer || {}, layerDetails || {}),
                    result = new LayerNode(parent, node);

                if (serviceLayer.subLayerIds) {
                    _.each(serviceLayer.subLayerIds, function(subLayerId) {
                        var childLayer = this.coalesceSubLayer(result, subLayerId);
                        result.addChild(childLayer);
                    }, this);
                }

                return result;
            },

            filterLayers: function(layers) {
                var filterText = this.getFilterText();
                if (filterText.length === 0) {
                    return layers;
                }
                // Include all leaf nodes that partially match `filterText` and
                // include all parent nodes that have at least one child.
                return _.filter(layers, function filterLayer(layer) {
                    if (!layer.hasChildren()) {
                        // TODO: Fuzzy match?
                        return layer.getDisplayName().toLowerCase().indexOf(filterText) !== -1;
                    } else {
                        layer.children = _.filter(layer.children, filterLayer);
                        return layer.getChildren().length > 0;
                    }
                });
            },

            // Ensure that `layers` always reflects the union of configuration
            // data with data fetched from map services.
            rebuildLayers: function() {
                this.layers = this.coalesceLayers();
                // Unfortunately, we need to execute `coalesceLayers` twice because
                // `filterLayers` mutates the data and I couldn't figure
                // out a better way to do a recursive copy.
                this.filteredLayers = this.filterLayers(this.coalesceLayers());
                this.emit(LAYERS_CHANGED);
            },

            // For layers not loaded on-demand, we sometimes need to manually
            // retrieve the layer ID from the service data depending on the
            // state of the state (if it's currently being rebuilt, for example).
            getServiceIdForLayer: function(layer) {
                var serviceData = getServiceData(layer),
                    layerData = _.first(_.filter(serviceData.layers, function(item) {
                        return item.name === layer.getName();
                    }));

                if (layerData) {
                    return layerData.id;
                }

                return null;
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
                return _.map(this.savedState.selectedLayers, this.findLayer, this);
            },

            clearAll: function() {
                this.filterTree('');
                this.setSelectedLayers([]);
                this.setExpandedLayers([]);
                this.emit(EVERYTHING_CHANGED);
            },

            isSelected: function(layerId) {
                return _.contains(this.savedState.selectedLayers, layerId);
            },

            toggleLayer: function(layerId) {
                var layer = this.findLayer(layerId);
                if (layer.isFolder()) {
                    if (this.isExpanded(layerId)) {
                        this.collapseLayer(layerId);
                    } else {
                        this.expandLayer(layerId);
                    }
                } else {
                    if (this.isSelected(layerId)) {
                        this.deselectLayer(layerId);
                    } else {
                        this.selectLayer(layerId);
                    }
                }
            },

            selectLayer: function(layerId) {
                this.setSelectedLayers(this.savedState.selectedLayers.concat(layerId));
                this.fetchMapService(layerId);
            },

            deselectLayer: function(layerId) {
                this.setSelectedLayers(_.without(this.savedState.selectedLayers, layerId));
            },

            setSelectedLayers: function(selectedLayers) {
                this.savedState.selectedLayers = selectedLayers;
                this.emit(SELECTED_LAYERS_CHANGED);
            },

            isExpanded: function(layerId) {
                return _.contains(this.savedState.expandedLayers, layerId);
            },

            expandLayer: function(layerId) {
                this.setExpandedLayers(this.savedState.expandedLayers.concat(layerId));
            },

            collapseLayer: function(layerId) {
                this.setExpandedLayers(_.without(this.savedState.expandedLayers, layerId));
            },

            setExpandedLayers: function(expandedLayers) {
                this.savedState.expandedLayers = expandedLayers;
                this.emit(LAYERS_CHANGED);
            },

            fetchMapService: function(layerId) {
                var layer = this.config.findLayer(layerId),
                    self = this;

                // If `layerId` couldn't be located in `config`, it means
                // that it's probably a layer loaded on-demand, so there
                // is no need to fetch anything.
                if (!layer) {
                    return new Deferred().resolve(self.findLayer(layerId));
                }

                return fetch(layer)
                        .then(self.rebuildLayers())
                        .then(function() {
                            return self.findLayer(layerId);
                        });
            },

            // Gets details for one layer. Returns a promise with
            // the provided layer and details.
            fetchLayerDetails: function(layer) {
                var self = this;

                // We need to fetch the service before we can fetch
                // the details.
                return this.fetchMapService(layer.id())
                        .then(function(newLayer) {
                            var layerId = newLayer.getServiceId();

                            if (!layerId) {
                                layerId = self.getServiceIdForLayer(newLayer);
                            }

                            var url = util.urljoin(newLayer.getServiceUrl(), layerId);

                            return ajaxUtil.fetch(url);
                        })
                        .then(function() {
                            self.rebuildLayers();
                        })
                        .then(function() {
                            return self.findLayer(layer.id());
                        });
            },

            getFilterText: function() {
                return this.savedState.filterText.trim().toLowerCase();
            },

            filterTree: function(filterText) {
                var self = this;

                if (filterText === this.savedState.filterText) {
                    return;
                }

                this.savedState.filterText = filterText;
                this.pauseEvents();

                // Apply filter.
                this.rebuildLayers();

                // Expand all layers that passed the filter.
                this.setExpandedLayers([]);
                _.each(this.filteredLayers, function(rootLayer) {
                    rootLayer.walk(function(layer) {
                        self.expandLayer(layer.id());
                    });
                });

                this.resumeEvents();
                this.emit(FILTER_CHANGED);
            },

            serialize: function() {
                return this.savedState;
            }
        });
    }
);
