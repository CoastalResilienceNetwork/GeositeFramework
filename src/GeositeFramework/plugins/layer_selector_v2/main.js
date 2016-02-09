﻿require({
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
        "framework/PluginBase",
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
             PluginBase,
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
                this.bindEvents();
            },

            bindEvents: function() {
                var self = this;
                $(this.container)
                    .on('click', 'a[data-layer-id]', function() {
                        var $el = $(this),
                            layerId = $el.attr('data-layer-id');
                        self.state.toggleLayer(layerId);
                    })
                    .on('keyup', '.pluginLayerSelector-search input', function() {
                        var $el = $(this),
                            filterText = $el.val();
                        self.state.filterTree(filterText);
                    })
                    .on('click', 'a.pluginLayerSelector-clear', function() {
                        self.state.clearAll();
                    });
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
                    visibleLayerIds[serviceUrl].push(layer.getServiceId());
                }, this);

                _.each(visibleLayerIds, function(layerIds, serviceUrl) {
                    var mapLayer = this.map.getLayer(serviceUrl);
                    if (layerIds.length === 0) {
                        mapLayer.setVisibleLayers([-1]);
                    } else {
                        mapLayer.setVisibleLayers(layerIds);
                    }
                }, this);
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

            renderTree: function() {
                var html = this.treeTmpl({
                    layers: this.state.getLayers(),
                    renderLayer: _.bind(this.renderLayer, this)
                });
                $(this.container).find('.tree-container').html(html);
            },

            renderLayer: function(layer) {
                return this.layerTmpl({
                    layer: layer,
                    state: this.state,
                    renderLayer: _.bind(this.renderLayer, this)
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

                this.state = new State(this.config, data);
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

            activate: function() {
                $(this.legendContainer).show().html('Layer Selector V2');
            },

            deactivate: function() {
                $(this.legendContainer).hide().html();
            },

            hibernate: function() {
                if (this.state) {
                    this.state.clearAll();
                }
                this.setState(null);
            }
        });
    }
);