require({
    packages: [
        {
            name: "jquery",
            location: "//ajax.googleapis.com/ajax/libs/jquery/1.9.0",
            main: "jquery.min"
        },
        {
            name: "underscore",
            location: "//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3",
            main: "underscore-min"
        }
    ]
});

define([
        "dojo/_base/declare",
        "jquery",
        "underscore",
        "dojo/text!./templates.html",
        "esri/layers/FeatureLayer",
        "esri/layers/ArcGISDynamicMapServiceLayer",
        "esri/layers/ArcGISTiledMapServiceLayer",
        "esri/layers/LayerDrawingOptions",
        "framework/PluginBase",
        //"./tests",
        "./state",
        "./config"
    ],
    function(declare,
             $,
             _,
             templates,
             FeatureLayer,
             ArcGISDynamicMapServiceLayer,
             ArcGISTiledMapServiceLayer,
             LayerDrawingOptions,
             PluginBase,
             //unitTests,
             State,
             Config) {
        "use strict";

        return declare(PluginBase, {
            toolbarName: "Map Layers v2",
            fullName: "Configure and control layers to be overlayed on the base map.",
            toolbarType: "sidebar",
            allowIdentifyWhenActive: true,
            hasCustomPrint: true,

            initialize: function (frameworkParameters, currentRegion) {
                declare.safeMixin(this, frameworkParameters);

                this.config = new Config();

                this.pluginTmpl = _.template(this.getTemplateByName('plugin'));
                this.filterTmpl = _.template(this.getTemplateByName('filter'));
                this.treeTmpl = _.template(this.getTemplateByName('tree'));
                this.layerTmpl = _.template(this.getTemplateByName('layer'));
                this.infoBoxTmpl = _.template(this.getTemplateByName('info-box'));
                this.layerMenuTmpl = _.template(this.getTemplateByName('layer-menu'));
                this.layerMenuId = _.uniqueId('layer-selector2-layer-menu-');

                this.bindEvents();
            },

            bindEvents: function() {
                var self = this;
                $(this.container)
                    .on('click', 'a.layer-row', function() {
                        self.state.toggleLayer(self.getClosestLayerId(this));
                    })
                    .on('click', 'a.show', function() {
                        self.state.toggleLayer(self.getClosestLayerId(this));
                    })
                    .on('click', 'a.info', function() {
                        self.showLayerInfo(self.getClosestLayerId(this));
                    })
                    .on('click', '.info-box .close', function() {
                        self.hideLayerInfo();
                    })
                    .on('click', 'a.more', function() {
                        self.showLayerMenu(this);
                    })
                    .on('keyup', 'input.filter', function() {
                        var $el = $(this),
                            filterText = $el.val();
                        self.state.filterTree(filterText);
                    })
                    .on('click', 'a.reset', function() {
                        self.state.clearAll();
                    });

                $('body')
                    .on('click', '#' + this.layerMenuId + ' a.download', function() {
                        var layerId = self.getClosestLayerId(this);
                        console.log('Download', layerId);
                        self.destroyLayerMenu();
                    })
                    .on('click', '#' + this.layerMenuId + ' a.zoom', function() {
                        self.zoomToLayerExtent(self.getClosestLayerId(this));
                        self.destroyLayerMenu();
                    })
                    .on('change', '#' + this.layerMenuId + ' .slider', function() {
                        var layerId = self.getClosestLayerId(this),
                            opacity = parseFloat($(this).find('input').val());
                        self.setLayerOpacity(layerId, opacity);
                    });
            },

            getClosestLayerId: function(el) {
                var $el = $(el),
                    $parent = $el.closest('[data-layer-id]'),
                    layerId = $parent.attr('data-layer-id');

                return layerId;
            },

            showLayerMenu: function(el) {
                var $el = $(el),
                    layerId = this.getClosestLayerId(el),
                    layer = this.state.findLayer(layerId),
                    supportsOpacity = this.state.serviceSupportsOpacity(layer.getServiceUrl()),
                    $menu = this._createLayerMenu(layerId),
                    $shadow = this._createLayerMenuShadow(),
                    position = this.determineLayerMenuPosition($el, layerId);

                $menu.css({
                    top: position.top,
                    left: position.left
                });

                $('body').append($shadow).append($menu);
            },

            _createLayerMenu: function(layerId) {
                var layer = this.state.findLayer(layerId),
                    supportsOpacity = this.state.serviceSupportsOpacity(layer.getServiceUrl()),
                    opacity = this.state.getLayerOpacity(layerId),
                    html = this.layerMenuTmpl({
                        layer: layer,
                        id: this.layerMenuId,
                        opacity: opacity,
                        supportsOpacity: supportsOpacity
                    });
                return $(html);
            },

            _createLayerMenuShadow: function() {
                var $shadow = $('<div class="layer-selector2-layer-menu-shadow">');
                $shadow.on('click', _.bind(this.destroyLayerMenu, this));
                return $shadow;
            },

            destroyLayerMenu: function() {
                $('body').find('.layer-selector2-layer-menu').remove();
                $('body').find('.layer-selector2-layer-menu-shadow').remove();
            },

            updateMap: function() {
                var visibleLayerIds = {};

                // Default existing layers to empty so that deselecting
                // all layers in a service will work correctly.
                _.each(this.map.getMyLayers(), function(mapLayer) {
                    visibleLayerIds[mapLayer.id] = [];
                });

                _.each(this.state.getSelectedLayers(), function(layer) {
                    var serviceUrl = layer.getServiceUrl(),
                        serviceId = layer.getServiceId();

                    if (_.isUndefined(serviceId)) {
                        return;
                    }

                    this.addServiceMapLayerIfNotExists(layer);

                    if (!visibleLayerIds[serviceUrl]) {
                        visibleLayerIds[serviceUrl] = [];
                    }

                    if (layer.isCombined()) {
                        _.each(layer.getChildren(), function(child) {
                            visibleLayerIds[serviceUrl].push(child.getServiceId());
                        });
                    } else {
                        visibleLayerIds[serviceUrl].push(layer.getServiceId());
                    }
                }, this);

                _.each(visibleLayerIds, function(layerServiceIds, serviceUrl) {
                    var mapLayer = this.map.getLayer(serviceUrl);
                    if (layerServiceIds.length === 0) {
                        mapLayer.setVisibleLayers([-1]);
                    } else {
                        mapLayer.setVisibleLayers(layerServiceIds);
                    }
                }, this);

                this.setOpacityForSelectedLayers(this.state.getSelectedLayers());
            },

            setOpacityForSelectedLayers: function(layers) {
                // If the layers haven't been added to the map yet we can't proceed.
                if (_.isEmpty(layers)) { return; }

                var layerByService = _.groupBy(layers, function(layer) {
                        return layer.getServiceUrl();
                    });

                _.each(layerByService, function(layers, serviceUrl) {
                    if (this.state.serviceSupportsOpacity(serviceUrl)) {
                        var drawingOptions = this.getDrawingOptions(layers),
                            mapLayer = this.map.getLayer(serviceUrl);
                        mapLayer.setLayerDrawingOptions(drawingOptions);
                    }
                }, this);
            },

            getDrawingOptions: function(layers) {
                var self = this,
                    drawingOptions = _.reduce(layers, function(memo, layer) {
                        var layerOpacity = self.state.getLayerOpacity(layer.id()),
                            drawingOption = new LayerDrawingOptions({
                                // 0 is totally opaque, 100 is 100% transparent.
                                // Opacity is stored as a decimal from 0 (transparent)
                                // to 1 (opaque) so we convert it and invert it here.
                                transparency: 100 - (layerOpacity * 100)
                            });

                        memo[layer.getServiceId()] = drawingOption;

                        return memo;
                    }, []);
                return drawingOptions;
            },

            // Create service layer and add it to the map if it doesn't already exist.
            addServiceMapLayerIfNotExists: function(layer) {
                var server = layer.getServer(),
                    serviceUrl = layer.getServiceUrl(),
                    mapLayer = this.map.getLayer(serviceUrl);

                // There's nothing to do if the service layer already exists.
                if (mapLayer) {
                    return;
                }

                mapLayer = this.createServiceMapLayer(server, serviceUrl);

                // Need to assign a deterministic ID, otherwise, the ESRI
                // JSAPI will generate a unique ID for us.
                mapLayer.id = serviceUrl;
                this.map.addLayer(mapLayer);
            },

            createServiceMapLayer: function(server, serviceUrl) {
                if (server.type === 'ags') {
                    if (server.layerType === 'dynamic') {
                        return new ArcGISDynamicMapServiceLayer(serviceUrl);
                    } else if (server.layerType === 'tiled') {
                        return new ArcGISTiledMapServiceLayer(serviceUrl);
                    } else if (server.layerType === 'feature-layer') {
                        return new FeatureLayer(serviceUrl);
                    } else {
                        throw new Error('AGS service layer type is not supported: ' + server.layerType);
                    }
                } else if (server.type === 'wms') {
                    throw new Error('WMS server type is not implemented yet');
                } else {
                    throw new Error('Service type not supported: ' + server.type);
                }
            },

            render: function() {
                $(this.container).html(this.pluginTmpl());
                this.renderFilter();
                this.renderTree();
            },

            renderFilter: function() {
                var html = this.filterTmpl({
                    filterText: this.state.getFilterText()
                });
                $(this.container).find('.filter-container').html(html);
            },

            renderTree: _.debounce(function() {
                var html = this.treeTmpl({
                    layers: this.state.getLayers(),
                    renderLayer: _.bind(this.renderLayer, this, 0)
                });
                $(this.container).find('.tree-container').html(html);
            }, 5),

            renderLayer: function(indent, layer) {
                var isSelected = this.state.isSelected(layer.id()),
                    isExpanded = this.state.isExpanded(layer.id());

                var cssClass = [];
                if (isSelected) {
                    cssClass.push('selected');
                }
                cssClass.push(layer.isFolder() ? 'parent-node' : 'leaf-node');
                cssClass = cssClass.join(' ');

                return this.layerTmpl({
                    layer: layer,
                    state: this.state,
                    cssClass: cssClass,
                    isSelected: isSelected,
                    isExpanded: isExpanded,
                    indent: indent,
                    renderLayer: _.bind(this.renderLayer, this, indent + 1)
                });
            },

            getTemplateByName: function(name) {
                return $('<div>').append(templates)
                    .find('#' + name)
                    .html().trim();
            },

            getState: function() {
                return this.state.serialize();
            },

            setState: function(data) {
                var self = this;

                if (this._cleanupPreviousState) {
                    this._cleanupPreviousState();
                }

                this.state = new State(this.config, data, this.currentRegion);
                this.updateMap();
                this.render();

                var eventHandles = [
                    this.state.on('change:all', function() {
                        self.render();
                    }),
                    this.state.on('change:filter', function() {
                        self.renderTree();
                    }),
                    this.state.on('change:layers', function() {
                        self.updateMap();
                        self.renderTree();
                    }),
                    this.state.on('change:selectedLayers', function() {
                        self.updateMap();
                        self.renderTree();
                    }),
                    this.state.on('change:opacity', function() {
                        self.updateMap();
                    })
                ];

                this._cleanupPreviousState = function() {
                    _.invoke(eventHandles, 'remove');
                };
            },

            beforePrint: function(printDeferred) {
                // We can short circuit the plugin print chain by simply
                // rejecting this deferred object.
                printDeferred.reject();

                // Trigger an export dialog for this pane.
                this.app.dispatcher.trigger('export-map:pane-' + this.app.paneNumber);
            },

            deactivate: function() {
                $(this.legendContainer).hide().html();
            },

            hibernate: function() {
                if (this.state) {
                    this.state.clearAll();
                }
                this.setState(null);
            },

            subregionActivated: function(currentRegion) {
                this.currentRegion = currentRegion.id;
                this.setState(this.getState());
            },

            subregionDeactivated: function(currentRegion) {
                this.currentRegion = null;
                this.setState(this.getState());
            },

            zoomToLayerExtent: function(layerId) {
                var layer = this.state.findLayer(layerId),
                    self = this;

                this.state.fetchLayerDetails(layer)
                    .then(function(newLayer) {
                        self.map.setExtent(newLayer.getExtent());
                    })
                    .otherwise(function(err) {
                        console.error(err);
                    });
            },

            showLayerInfo: function(layerId) {
                var self = this,
                    layer = this.state.findLayer(layerId);

                this.state.fetchLayerDetails(layer)
                    .then(function(newLayer) {
                        var html = self.infoBoxTmpl({
                                layer: newLayer
                            });
                        $(self.container).find('.info-box-container').html(html);
                    })
                    .otherwise(function(err) {
                        console.error(err);
                    });
            },

            hideLayerInfo: function() {
                $(this.container).find('.info-box-container').empty();
            },

            setLayerOpacity: function(layerId, opacity) {
                this.state.setLayerOpacity(layerId, opacity);
            },

            // Depending on what features are supported by the selected layer,
            // the top of the layer menu should be positioned differently.
            determineLayerMenuPosition: function($el, layerId) {
                var offset = $el.offset(),
                    layer = this.state.findLayer(layerId),
                    supportsOpacity = this.state.serviceSupportsOpacity(layer.getServiceUrl()),
                    top = offset.top;

                // Account for the height of the layer menu option if
                // the option won't be shown in the menu.
                if (!supportsOpacity) {
                    top = top + 59;
                }

                if (!layer.getDownloadUrl()) {
                    top = top + 32;
                }

                return {
                    top: top,
                    left: offset.left
                };
            }
        });
    }
);
