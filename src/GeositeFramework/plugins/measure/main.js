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
    ]
});

define(
    ["dojo/_base/declare", "framework/PluginBase", "./AgsMeasure", "dojo/text!plugins/measure/templates.html"],
    function (declare, PluginBase, AgsMeasure, templates) {
        return declare(PluginBase, {
            toolbarName: "Measure",
            fullName: "Measure distances and area on the map",
            toolbarType: "map",
            // Load script templates into a dom fragment
            $templates: $('<div>').append($($.trim(templates))),

            initialize: function (args) {
                declare.safeMixin(this, args);
                this.agsMeasure = new AgsMeasure({
                    map: this.map,
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

            hibernate: function () {
                this.deactivate();
                if (this._pointLayer)  this._pointLayer.clear(); 
                if (this._lineLayer) this._lineLayer.clear();
            }
        });
    }
);