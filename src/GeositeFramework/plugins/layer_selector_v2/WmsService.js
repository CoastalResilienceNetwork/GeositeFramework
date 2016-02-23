define([
        "dojo/_base/declare",
        "dojo/Deferred",
        "underscore",
        "./lib/xmlToJson",
        "framework/util/ajax",
        "./util",
        "./LayerNode",
    ],
    function(declare,
             Deferred,
             _,
             xmlToJson,
             ajaxUtil,
             util,
             LayerNode) {
        "use strict";

        var jsonResponseCache = {};

        function get(url) {
            return jsonResponseCache[url];
        }

        return declare(null, {
            constructor: function(server) {
                this.server = server;
                this.defaultAjaxOptions = {
                    format: 'text',
                    content: ''
                };
            },

            getServiceUrl: function() {
                return util.urljoin(this._getBaseServiceUrl() + '?request=GetCapabilities&service=WMS');
            },

            _getBaseServiceUrl: function() {
                // If name exists, this is likely an AGS WMS service,
                // as opposed to GeoServer.
                if (this.server.name) {
                    return util.urljoin(this.server.url, this.server.name, 'MapServer/WMSServer');
                } else {
                    return this.server.url;
                }
            },

            // Return a promise containing map service data.
            fetchMapService: function() {
                var self = this;
                return ajaxUtil.fetch(this.getServiceUrl(), this.defaultAjaxOptions).
                        then(function(response) {
                            var responseJSON = self._transformServiceData(response);
                            jsonResponseCache[self.getServiceUrl()] = responseJSON;
                            return responseJSON;
                        });
            },

            // Return cached map service data.
            getServiceData: function() {
                return get(this.getServiceUrl());
            },

            // Return a promise with service layer data.
            fetchLayerDetails: function(tree, layerId) {
                // There are no layer details for a
                // WMS layer.
                return new Deferred().resolve({});
            },

            // Return cached layer details.
            getLayerDetails: function(serviceLayer) {
                // There are no layer details for a
                // WMS layer.
                return {};
            },

            // Find the corresponding data for `layer` in the map service.
            findServiceLayer: function(layer) {
                var serviceData = this.getServiceData();

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
            },

            findServiceLayerById: function(layerId) {
                var serviceData = this.getServiceData();
                if (serviceData) {
                    return _.findWhere(serviceData.layers, { id: layerId });
                }
                return null;
            },

            supportsOpacity: function() {
                return false;
            },

            // Maps the WMS XML service data to JSON that closely
            // matches the JSON returned by the ESRI JS API.
            _transformServiceData: function(serviceData) {
                var output = {
                        layers: []
                    },
                    jsonServiceData = xmlToJSON.parseString(serviceData, {
                        childrenAsArray: false
                    }).WMS_Capabilities;

                output.currentVersion = jsonServiceData._attr.version._value;

                // Add layers
                _.each(jsonServiceData.Capability.Layer.Layer, function(layer) {
                    var jsonLayer = {
                        id: layer.Name._text,
                        name: layer.Title._text,
                        parentLayerId: null,
                        subLayerIds: null
                    };

                    // Set Extent
                    var boundingBox = _.isArray(layer.BoundingBox) ? layer.BoundingBox[0] : layer.BoundingBox;
                    if (boundingBox) {
                        jsonLayer.extent = {
                            spatialReference: {
                                latestWkid: boundingBox._attr.CRS._value.split(':')[1],
                                wkid: boundingBox._attr.CRS._value.split(':')[1]
                            },
                            xmax: boundingBox._attr.maxx._value,
                            xmin: boundingBox._attr.minx._value,
                            ymax: boundingBox._attr.maxy._value,
                            ymin: boundingBox._attr.miny._value,
                        };
                    }

                    output.layers.push(jsonLayer);
                });

                return output;
            },
        });
    }
);