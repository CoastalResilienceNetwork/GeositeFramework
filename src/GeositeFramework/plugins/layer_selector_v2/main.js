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
                this.treeTmpl = _.template(this.getTemplateByName('tree'));
                this.layerTmpl = _.template(this.getTemplateByName('layer'));
                this.bindEvents();
            },

            bindEvents: function() {
                var self = this;
                $(this.container).on('click', 'a[data-layer-id]', function() {
                    var $el = $(this),
                        layerId = $el.attr('data-layer-id');
                    self.state.toggleLayer(layerId);
                });
            },

            onStateChanged: function() {
                this.updateMap();
                this.render();
            },

            updateMap: function() {
                var self = this,
                    visibleLayerIds = {},
                    layers = this.state.getSelectedLayers();

                // Default existing layers to empty so that deselecting
                // all layers in a service will work correctly.
                _.each(this.map.getMyLayers(), function(mapLayer) {
                    visibleLayerIds[mapLayer.id] = [];
                });

                _.each(layers, function(layer) {
                    if (!layer) {
                        return;
                    }

                    var serviceUrl = layer.getServiceUrl(),
                        serviceData = self.state.getServiceData(layer),
                        serviceLayer = self.state.findServiceLayer(serviceData, layer);

                    // Map service isn't loaded yet.
                    if (!serviceLayer) {
                        return;
                    }

                    self.addServiceMapLayerIfNotExists(layer);

                    if (!visibleLayerIds[serviceUrl]) {
                        visibleLayerIds[serviceUrl] = [];
                    }
                    visibleLayerIds[serviceUrl].push(serviceLayer.id);
                });

                _.each(visibleLayerIds, function(layerIds, serviceUrl) {
                    var mapLayer = self.map.getLayer(serviceUrl);
                    if (layerIds.length === 0) {
                        mapLayer.setVisibleLayers([-1]);
                    } else {
                        mapLayer.setVisibleLayers(layerIds);
                    }
                });
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
                var layers = this.config.getLayers(),
                    html = this.renderTree(layers);
                $(this.container).html(html);
            },

            renderTree: function(layers) {
                return this.treeTmpl({
                    layers: layers,
                    renderLayer: _.bind(this.renderLayer, this)
                });
            },

            renderLayer: function(layer) {
                var serviceData = this.state.getServiceData(layer),
                    serviceLayer = this.state.findServiceLayer(serviceData, layer);
                return this.layerTmpl({
                    layer: layer,
                    serviceLayer: serviceLayer,
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
                if (this._cleanupPreviousState) {
                    this._cleanupPreviousState();
                }

                this.state = new State(this.config, data);
                this.render();

                var handle = this.state.on('update', _.bind(this.onStateChanged, this));
                this._cleanupPreviousState = function() {
                    handle.remove();
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
                    this.state.clearAllLayers();
                }
                this.setState(null);
            }
        });
    }
);