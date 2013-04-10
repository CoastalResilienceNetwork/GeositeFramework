// Module LayerManager.js

define([
        "dojo/json",
        "use!tv4",
        "use!underscore",
        "./AgsLoader",
        "./WmsLoader",
    ],
    function (JSON, tv4, _, AgsLoader, WmsLoader) {

        var LayerManager = function (app) {
            var _app = app,
                _urls = [],
                _rootNode = null,
                _cssClassPrefix = 'pluginLayerSelector',
                _onLoadingComplete;

            this.load = loadLayerData;

            function loadLayerData(layerSourcesJson, onLoadingComplete) {
                _onLoadingComplete = onLoadingComplete;
                var layerData = parseLayerConfigData(layerSourcesJson);
                if (layerData) {
                    // Load layer info from each source
                    _rootNode = makeRootNode();
                    if (layerData.agsSources !== undefined) {
                        _.each(layerData.agsSources, function (url) {
                            var loader = new AgsLoader(url);
                            loadLayerSource(loader, url);
                        });
                    }
                    if (layerData.wmsSources !== undefined) {
                        _.each(layerData.wmsSources, function (spec) {
                            var loader = new WmsLoader(spec.url, spec.folderTitle);
                            loadLayerSource(loader, spec.url, spec.layerIds);
                        });
                    }
                }
            }

            function parseLayerConfigData(layerSourcesJson) {
                // Parse and validate config data to get URLs of layer sources
                var errorMessage;
                try {
                    var data = JSON.parse(layerSourcesJson),
                        schema = layerConfigSchema,
                        valid = tv4.validate(data, schema);
                    if (valid) {
                        return data;
                    } else {
                        errorMessage = tv4.error.message + " (data path: " + tv4.error.dataPath + ")";
                    }
                } catch (e) {
                    errorMessage = e.message;
                }
                _app.error("", "Error in config file layers.json: " + errorMessage);
                return null;
            }

            // Schema for validating layers.config file (see http://json-schema.org)

            var layerConfigSchema = {
                $schema: 'http://json-schema.org/draft-04/schema#',
                title: 'layer_selector plugin: layer sources specification',
                type: 'object',
                additionalProperties: false,
                properties: {
                    agsSources: {
                        type: 'array',
                        items: { type: 'string' }
                    },
                    wmsSources: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                url: { type: 'string' },
                                folderTitle: { type: 'string' },
                                layerIds: {
                                    type: 'array',
                                    items: { type: 'string' }
                                }
                            },
                            required: ['url', 'folderTitle'],
                            additionalProperties: false
                        }
                    }
                }
            }

            function loadLayerSource(loader, url, layerIdWhitelist) {
                _urls.push(url);
                loader.load(_rootNode, layerIdWhitelist, makeContainerNode, makeLeafNode, onLayerSourceLoaded, onLayerSourceLoadError)
            }

            function onLayerSourceLoaded(url) {
                // Specified URL is loaded; remove it from the list
                _urls = _.without(_urls, url);
                if (_urls.length == 0) {
                    // All URLs are loaded
                    _onLoadingComplete(_rootNode);
                }
            }

            function onLayerSourceLoadError(jqXHR, textStatus, errorThrown) {
                _app.error("", "AJAX request to load layer source failed: '" + (jqXHR.resultText || jqXHR)
                    + "' Status: '" + textStatus + "' Error: '" + errorThrown + "'");
            }

            // ------------------------------------------------------------------------
            // Functions to build a node tree of map layers. The node schema targets Ext.data.TreeStore 
            // and Ext.tree.Panel, but should be generic enough for other UI frameworks.

            function makeRootNode() {
                var node = {
                    expanded: true,
                    children: []
                };
                return node;
            }

            function makeContainerNode(name, type, parentNode) {
                var node = {
                    type: type,
                    cls: _cssClassPrefix + "-" + type, // When the tree is displayed the node's associated DOM element will have this CSS class
                    text: name.replace(/_/g, " "),
                    leaf: false,
                    children: [],
                    parent: parentNode
                };
                parentNode.children.push(node);
                return node;
            }

            function makeLeafNode(title, layerId, showOrHideLayer, parentNode) {
                var node = {
                    type: "layer",
                    cls: _cssClassPrefix + "-layer", // When the tree is displayed the node's associated DOM element will have this CSS class
                    text: title.replace(/_/g, " "),
                    leaf: true,
                    checked: false,
                    layerId: layerId,
                    parent: parentNode,
                    showOrHideLayer: showOrHideLayer // function which shows or hides the layer
                };
                parentNode.children.push(node);
                return node;
            }
        }

        return LayerManager;
    }
);