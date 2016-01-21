require({
    packages: [
        {
            name: "underscore",
            location: "//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3",
            main: "underscore-min"
        }
    ]
});

define([
        "dojo/_base/declare",
        "dojo/json",
        "use!tv4",
        "./schema",
        "dojo/text!./layers.json",
        "underscore"
    ],
    function (declare, JSON, tv4, layerConfigSchema, layerSourcesJson, _) {

        // Wraps raw layer nodes from the plugin configuration to provide
        // convenience functions for template rendering.
        // References to parent nodes are preserved to support property
        // inheritance.
        var LayerNode = declare(null, {
            constructor: function(parent, node) {
                this.parent = parent;
                this.node = node;
                this.children = [];
            },
            addChild: function(layerNode) {
                this.children.push(layerNode);
            },
            getDisplayName: function() {
                return this.node.displayName || this.node.name;
            },
            getChildren: function() {
                return this.children;
            },
            hasChildren: function() {
                return this.children.length > 0;
            },
            isLoading: function() {
                return false;
            }
        });

        function createLayerNode(parent, node) {
            var result = new LayerNode(parent, node);
            _.each(node.includeLayers || [], function(childNode) {
                result.addChild(createLayerNode(result, childNode));
            });
            return result;
        }

        return declare(null, {
            constructor: function () {
                var rawNodes = this.parse(layerSourcesJson);
                this.layers = _.map(rawNodes, function(node) {
                    return createLayerNode(null, node);
                });
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
            }
        });
    }
);
