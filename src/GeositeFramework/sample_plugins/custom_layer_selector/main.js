
define([
    "dojo/_base/declare",
    "plugins/layer_selector/main",
    "dojo/text!./layers.json"],
    function (declare,
              LayerSelectorPlugin,
              layerSourcesJson) {
        return declare(LayerSelectorPlugin, {
            toolbarName: "Custom Map Layers",
            fullName: "Map layers plugin with custom layers.json",

            getLayersJson: function() {
                return layerSourcesJson;
            }
        });
    }
);
