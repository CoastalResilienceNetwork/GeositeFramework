// Module WmsLoader.js

define([
        "dojo/json",
        "use!underscore",
        "./AgsLoader",
        "./WmsLoader",
    ],
    function (JSON, _, AgsLoader, WmsLoader) {

        var LayerLoader = function () {
            var _urls = [],
                _rootNode = null,
                _cssClassPrefix = 'pluginLayerSelector',
                _onLoadingComplete;

            this.load = loadLayerData;

            function loadLayerData(layerSourcesJson, onLoadingComplete) {
                _onLoadingComplete = onLoadingComplete;

                // Parse config data to get URLs of layer sources
                var layerData;
                try {
                    layerData = JSON.parse(layerSourcesJson);
                } catch (e) {
                    // TODO: log server-side
                    alert("Error in layer_selector plugin config file layers.json: " + e.message);
                }

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
                // TODO: log server side
                alert('AJAX error: ' + errorThrown);
            }

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

        return LayerLoader;
    }
);