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
            name: "jquery.placeholder",
            location: location.pathname.replace(/\/[^/]+$/, "") + "plugins/layer_selector/lib",
            main: "jquery.placeholder.amd.min"
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
        "use!underscore",
        "./AgsLoader",
        "./WmsLoader",
        "./Ui",
        "dojo/text!plugins/layer_selector/layers.json"
    ],
    function (declare, JSON, _, AgsLoader, WmsLoader, Ui, layerSourcesJson) {

        function loadLayerData(self) {
            // Parse config file to get URLs of layer sources
            var layerData,
                cssClassPrefix = 'pluginLayerSelector';
            try {
                layerData = JSON.parse(layerSourcesJson);
            } catch (e) {
                // TODO: log server-side
                alert("Error in layer_selector plugin config file layers.json: " + e.message);
            }
            // Load layer info from each source
            if (layerData.agsSources !== undefined) {
                _.each(layerData.agsSources, function (url) {
                    var loader = new AgsLoader(url, cssClassPrefix);
                    loadLayerSource(self, loader, url);
                });
            }
            if (layerData.wmsSources !== undefined) {
                _.each(layerData.wmsSources, function (spec) {
                    var loader = new WmsLoader(spec.url, spec.folderName, cssClassPrefix);
                    loadLayerSource(self, loader, spec.url);
                });
            }
        }

        function loadLayerSource(self, loader, url) {
            self._urls.push(url);
            loader.load(self._layerTree,
                function () {
                    onLayerSourceLoaded(self, url);
                },
                function (jqXHR, textStatus, errorThrown) {
                    // TODO: log server side
                    alert('AJAX error: ' + errorThrown);
                }
            );
        }

        function onLayerSourceLoaded(self, url) {
            // Specified URL is loaded; remove it from the list
            self._urls = _.without(self._urls, url);
            if (self._urls.length == 0) {
                // All URLs are loaded; render UI
                self._ui.render(self._layerTree);
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
                var self = this;
                declare.safeMixin(self, frameworkParameters);
                self._ui = new Ui(self.container, self.map);
                loadLayerData(self);
            },

            activate: function () {
                this._ui.display();
            }

        });
    }
);