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
            EVERYTHING_CHANGED = 'change:all',
            OPACITY_CHANGED = 'change:opacity';

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
        function getServiceData(serviceUrl) {
            return ajaxUtil.get(serviceUrl);
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

        function getLayerDetails(layer, serviceLayer) {
            if (!serviceLayer) {
                return;
            }
            var url = util.urljoin(layer.getServiceUrl(), serviceLayer.id);
            return ajaxUtil.get(url);
        }

        return declare([PausableEvented], {
            constructor: function(config, data, currentRegion) {
                this.savedState = _.defaults({}, data, {
                    filterText: '',
                    // Selected layerIds (in-order).
                    selectedLayers: [],
                    // Expanded layerIds.
                    expandedLayers: [],
                    // List of objects as { layerId: opacityValue }.
                    layerOpacity: []
                });
                this.config = config;
                this.currentRegion = currentRegion;
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
                var serviceData = getServiceData(layer.getServiceUrl()),
                    serviceLayer = findServiceLayer(serviceData, layer),
                    layerDetails = getLayerDetails(layer, serviceLayer),
                    node = _.assign({}, serviceLayer || {}, layerDetails || {}, layer.getData()),
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
                var serviceData = getServiceData(parent.getServiceUrl()),
                    serviceLayer = findServiceLayerById(serviceData, subLayerId),
                    layerDetails = getLayerDetails(parent, serviceLayer),
                    node = _.assign({}, serviceLayer || {}, layerDetails || {}),
                    result = new LayerNode(node, parent);

                if (serviceLayer.subLayerIds) {
                    _.each(serviceLayer.subLayerIds, function(subLayerId) {
                        var childLayer = this.coalesceSubLayer(result, subLayerId);
                        result.addChild(childLayer);
                    }, this);
                }

                return result;
            },

            filterByName: function(layers, filterText) {
                if (filterText.length === 0) {
                    return layers;
                }

                filterText = filterText.toLowerCase();

                // Include all leaf nodes that partially match `filterText` and
                // include all parent nodes that have at least one child.
                return _.filter(layers, function filterLayer(layer) {
                    if (!layer.isFolder()) {
                        // TODO: Fuzzy match?
                        return layer.getDisplayName().toLowerCase().indexOf(filterText) !== -1;
                    } else {
                        layer.children = _.filter(layer.children, filterLayer);
                        return layer.getChildren().length > 0;
                    }
                });
            },

            filterByRegion: function(layers, currentRegion) {
                return _.filter(layers, function filterLayer(layer) {
                    if (!layer.isAvailableInRegion(currentRegion)) {
                        return false;
                    } else if (layer.isFolder()) {
                        layer.children = _.filter(layer.children, filterLayer);
                        return layer.getChildren().length > 0;
                    }
                    return true;
                });
            },

            // Ensure that `layers` always reflects the union of configuration
            // data with data fetched from map services.
            rebuildLayers: function() {
                this.layers = this.coalesceLayers();

                // `coalesceLayers` needs to be executed again because the filter
                // logic mutates the data and we don't want to alter `layers`.
                var filteredLayers = this.coalesceLayers();
                filteredLayers = this.filterByRegion(filteredLayers, this.currentRegion);
                filteredLayers = this.filterByName(filteredLayers, this.getFilterText());
                this.filteredLayers = filteredLayers;

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
                return _.map(this.savedState.selectedLayers, this.findLayer, this);
            },

            getSelectedLayersForService: function(serviceUrl) {
                var self = this;
                return _.reduce(this.savedState.selectedLayers, function(memo, layer) {
                    var layerNode = self.findLayer(layer);
                    if (layerNode && layerNode.getServiceUrl() === serviceUrl) {
                        memo.push(layer);
                    }
                    return memo;
                }, []);
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
                        .then(_.bind(this.rebuildLayers, this))
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
                            var layerId = newLayer.getServiceId(),
                                url = util.urljoin(newLayer.getServiceUrl(), layerId);
                            return ajaxUtil.fetch(url);
                        })
                        .then(_.bind(this.rebuildLayers, this))
                        .then(function() {
                            return self.findLayer(layer.id());
                        });
            },

            getFilterText: function() {
                return this.savedState.filterText.trim();
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
            },

            getLayerOpacity: function(layerId) {
                var savedLayerOpacity = _.findWhere(this.savedState.layerOpacity, { layerId: layerId });

                if (savedLayerOpacity) {
                    return savedLayerOpacity.opacity;
                } else {
                    var layer = this.findLayer(layerId),
                        configOpacity = layer.getOpacity();

                    if (configOpacity) {
                        return configOpacity;
                    }
                }

                return 1;
            },

            setLayerOpacity: function(layerId, opacity) {
                var layerItem = _.findWhere(this.savedState.layerOpacity, { layerId: layerId });

                if (layerItem) {
                    layerItem.opacity = opacity;
                } else {
                    this.savedState.layerOpacity.push({
                        layerId: layerId,
                        opacity: opacity
                    });
                }

                this.emit(OPACITY_CHANGED);
            },

            serviceSupportsOpacity: function(serviceUrl) {
                var serviceData = getServiceData(serviceUrl);
                return serviceData && serviceData.supportsDynamicLayers;
            }
        });
    }
);
