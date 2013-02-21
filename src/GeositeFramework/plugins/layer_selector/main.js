// Main module for GeositeFramework plugin "layer_selector"

// Plugins should contain local versions of any libraries used even if those libraries are used 
// by the GeositeFramework, in case a future framework version switches to a different library version. 
//
// Specify library locations.
//
// The calls to location.pathname.replace() below prepend the app's root path to library locations. 
// Otherwise, since Dojo is loaded from a CDN it will prepend the CDN server path, and fail.
// (See https://dojotoolkit.org/documentation/tutorials/1.7/cdn)

require({
    packages: [
        {
            name: "jquery",
            location: location.pathname.replace(/\/[^/]+$/, "") + "plugins/layer_selector/lib",
            main: "jquery-1.9.0.min"
        },
        {
            name: "underscore",
            location: location.pathname.replace(/\/[^/]+$/, "") + "plugins/layer_selector/lib",
            main: "underscore-1.4.4-amd.min" // AMD-compliant version from https://github.com/amdjs/underscore
        }
    ]
});

define([
        "dojo/_base/declare",
        "jquery",
        "underscore",
        "./AgsLoader",
        "./Ui"
    ],
    function (declare, $, _, AgsLoader, Ui) {

        function loadLayersConfig(self)
        {
            return $.ajax({
                dataType: 'json',
                contentType: "application/json",
                url: 'plugins/layer_selector/layers.json',
                success: function (layerData) { loadLayerData(self, layerData); },
                error: handleAjaxError
            });
        }

        function loadLayerData(self, layerData) {
            self._layerTree = { expanded: true, children: [] };
            if (layerData.agsSources !== undefined) {
                _.each(layerData.agsSources, function (baseUrl) {
                    self._agsLoader = new AgsLoader(baseUrl);
                    self._agsLoader.load(self._layerTree);
                });
            }
        }

        function handleAjaxError(jqXHR, textStatus, errorThrown) {
            // TODO: do something better
            alert('AJAX error: ' + errorThrown);
        }

        return declare(null, {
            toolbarName: "Map Layers",
            fullName: "Configure and control layers to be overlayed on the base map.",
            toolbarType: "sidebar",

            _layerTree: null,
            _agsLoader: null,

            initialize: function (args) {
                declare.safeMixin(this, args);
                loadLayersConfig(this);
            },

            activate: function () {
                if (this._agsLoader.isLoaded()) {
                    var ui = new Ui(this.map);
                    ui.render(this._layerTree, this.container);
                } else {
                    // TODO: something better
                    alert("Layers have not finished loading, please try again soon");
                }
            }

        });
    }
);