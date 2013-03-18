// "measure" plugin, main module


// Plugins should load their own versions of any libraries used even if those libraries are also used 
// by the GeositeFramework, in case a future framework version uses a different library version. 

require({
    // Specify library locations.
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