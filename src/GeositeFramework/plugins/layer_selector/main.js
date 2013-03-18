// "layer_selector" plugin, main module

// Plugins should load their own versions of any libraries used even if those libraries are also used 
// by the GeositeFramework, in case a future framework version uses a different library version. 

require({
    // Specify library locations.
    // The calls to location.pathname.replace() below prepend the app's root path to the specified library location. 
    // Otherwise, since Dojo is loaded from a CDN, it will prepend the CDN server path and fail, as described in
    // https://dojotoolkit.org/documentation/tutorials/1.7/cdn
    packages: [
        {
            name: "jquery",
            location: "//ajax.googleapis.com/ajax/libs/jquery/1.9.0",
            main: "jquery.min"
        },
        {
            name: "underscore",
            location: "//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.4.4",
            main: "underscore-min"
        },
        {
            name: "extjs",
            location: "//cdn.sencha.io/ext-4.1.1-gpl",
            main: "ext-all"
        },
        {
            name: "jquery.placeholder",
            location: location.pathname.replace(/\/[^/]+$/, "") + "plugins/layer_selector/lib",
            main: "jquery.placeholder.amd.min"
        },
        {
            name: "tv4",
            location: location.pathname.replace(/\/[^/]+$/, "") + "plugins/layer_selector/lib",
            main: "tv4.min"
        }
    ]
});

define([
        "dojo/_base/declare",
        "./LayerLoader",
        "./Ui",
        "dojo/text!plugins/layer_selector/layers.json"
    ],
    function (declare, LayerLoader, Ui, layerSourcesJson) {

        return declare(null, {
            toolbarName: "Map Layers",
            fullName: "Configure and control layers to be overlayed on the base map.",
            toolbarType: "sidebar",

            _ui: null,

            initialize: function (frameworkParameters) {
                declare.safeMixin(this, frameworkParameters);
                this._ui = new Ui(this.container, this.map);
                // Load layer sources, then render UI passing the tree of layer nodes
                var self = this;
                new LayerLoader(this.app).load(layerSourcesJson, function (tree) {
                    self._ui.render(tree);
                });
            },

            activate: function () {
                this._ui.display();
            }

        });
    }
);