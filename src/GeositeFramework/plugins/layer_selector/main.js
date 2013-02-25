// Main module for GeositeFramework plugin "layer_selector"

// Plugins should contain local versions of any libraries used even if those libraries are also used 
// by the GeositeFramework, in case a future framework version uses a different library version. 

require({
    // Specify library locations.
    // The calls to location.pathname.replace() below prepend the app's root path to the specified library location. 
    // Otherwise, since Dojo is loaded from a CDN, it will prepend the CDN server path and fail, as described in
    // https://dojotoolkit.org/documentation/tutorials/1.7/cdn
    packages: [
        {
            name: "jquery",
            location: location.pathname.replace(/\/[^/]+$/, "") + "plugins/layer_selector/lib",
            main: "jquery-1.9.0.min"
        },
        {
            name: "underscore",
            location: location.pathname.replace(/\/[^/]+$/, "") + "plugins/layer_selector/lib",
            main: "underscore-1.4.3.min"
        },
        {
            name: "extjs",
            location: location.pathname.replace(/\/[^/]+$/, "") + "plugins/layer_selector/lib/ext-4.1.1a",
            main: "ext-all"
        }
    ],
    // The next two sections configure https://github.com/tbranyen/use.js, which handles non-AMD-compliant libraries
    // like Underscore and Ext JS. (Note the reference to "use!underscore" below.)
    paths: {
        "use": location.pathname.replace(/\/[^/]+$/, "") + "plugins/layer_selector/lib/use"
    },
    use: {
        "underscore": { attach: "_" },
        "extjs": { attach: "Ext" }
    }
});

define([
        "dojo/_base/declare",
        "dojo/json",
        "jquery",
        "use!underscore",
        "./AgsLoader",
        "./Ui",
        "dojo/text!plugins/layer_selector/layers.json"
    ],
    function (declare, JSON, $, _, AgsLoader, Ui, layerSourcesJson) {

        function loadLayerData(self) {
            var layerData;
            try {
                layerData = JSON.parse(layerSourcesJson);
            } catch (e) {
                // TODO: log server-side
                alert("Error in layer_selector plugin config file layers.json: " + e.message);
            }
            if (layerData.agsSources !== undefined) {
                _.each(layerData.agsSources, function (url) {
                    var loader = new AgsLoader(url);
                    loader.load(self._layerTree, self);
                    self._urls.push(url);
                });
            }
        }

        return declare(null, {
            toolbarName: "Map Layers",
            fullName: "Configure and control layers to be overlayed on the base map.",
            toolbarType: "sidebar",

            _layerTree: { expanded: true, children: [] },
            _urls: [],
            _ui: null,

            initialize: function (frameworkParameters) {
                declare.safeMixin(this, frameworkParameters);
                this._ui = new Ui(this.container, this.map);
                loadLayerData(this);
            },

            onLayerSourceLoaded: function (url) {
                // Specified URL is loaded; remove it from the list
                this._urls = _.without(this._urls, url);
                if (this._urls.length == 0) {
                    // All URLs are loaded; render UI
                    this._ui.render(this._layerTree);
                }
            },

            activate: function () {
                this._ui.display();
            }

        });
    }
);