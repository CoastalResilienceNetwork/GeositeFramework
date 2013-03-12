// Main module for GeositeFramework plugin "measure"

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
        }
    ],
    // The next two sections configure https://github.com/tbranyen/use.js, which handles non-AMD-compliant libraries
    // like Underscore. (Note the reference to "use!underscore" below.)
    paths: {
        "use": location.pathname.replace(/\/[^/]+$/, "") + "plugins/layer_selector/lib/use"
    },
    use: {
        "underscore": { attach: "_" },
        "tv4": { attach: "tv4" },
        "extjs": { attach: "Ext" }
    }
});

define(
    ["dojo/_base/declare", "./AgsMeasure", "dojo/text!plugins/measure/templates.html"],
    function (declare, AgsMeasure, templates) {
        return declare(null, {
            toolbarName: "Measure",
            fullName: "Measure distances and area on the map",
            toolbarType: "map",
            // Load script templates into a dom fragment
            $templates: $('<div>').append($(templates.trim())),

            initialize: function (args) {
                declare.safeMixin(this, args);
                this.agsMeasure = new AgsMeasure({
                    map: this._unsafeMap,
                    tooltipTemplate: this.$templates.find('#template-measure-tooltip').html(),
                    infoBubbleTemplate: this.$templates.find('#template-measure-infobubble').html()
                });

                this.agsMeasure.initialize();
            },
            
            renderLauncher: function renderLauncher() {
                return this.$templates.find('#template-measure-launcher').html();
            },

            activate: function () {
                this.agsMeasure.activate();
            },

            deactivate: function () {
                this.agsMeasure.deactivate();
            },

            destroy: function () {
                this.deactivate();
                this._pointLayer.clear();
                this._lineLayer.clear();
            }
        });
    }
);