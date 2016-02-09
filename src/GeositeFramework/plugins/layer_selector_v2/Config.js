define([
        "dojo/_base/declare",
        "dojo/json",
        "use!tv4",
        "underscore",
        "./LayerNode",
        "./schema",
        "dojo/text!./layers.json",
        "./util"
    ],
    function(declare, JSON, tv4, _,
             LayerNode,
             layerConfigSchema,
             layerSourcesJson,
             util) {
        "use strict";

        return declare(null, {
            constructor: function () {
                var rawNodes = this.parse(layerSourcesJson);
                this.layers = _.map(rawNodes, function(node) {
                    return this.createLayerNode(null, node);
                }, this);
            },

            // Recursively wrap raw layer nodes.
            createLayerNode: function(parent, node) {
                var self = this,
                    result = new LayerNode(parent, node);
                _.each(node.includeLayers || [], function(childNode) {
                    result.addChild(self.createLayerNode(result, childNode));
                });
                return result;
            },

            parse: function(json) {
                var errorMessage;
                try {
                    var data = JSON.parse(json),
                        valid = tv4.validate(data, layerConfigSchema);
                    if (valid) {
                        return data;
                    } else {
                        errorMessage = tv4.error.message + " (data path: " + tv4.error.dataPath + ")";
                    }
                } catch (e) {
                    errorMessage = e.message;
                }
                console.error(errorMessage);
                return null;
            },

            getLayers: function() {
                return this.layers;
            },

            findLayer: function(layerId) {
                return util.find(this.layers, function(layer) {
                    return layer.findLayer(layerId);
                });
            }
        });
    }
);
