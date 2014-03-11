define(
    ["dojo/_base/declare", "framework/PluginBase"],
    function (declare, PluginBase) {
        var $legendEl = null;
        
        return declare(PluginBase, {
            toolbarName: "LegendDisplay",
            fullName: "Show/Hide the map legend",
            toolbarType: "map",
            allowIdentifyWhenActive: true,
            
            initialize: function (args) {
                declare.safeMixin(this, args);
                $legendEl = $(this.legendContainer.parentElement);
            },
            
            renderLauncher: function () {
                return '<div class="legend-display"></div>';
            },

            activate: function () {
                $legendEl.toggle();
                this.forceDeactivate();
            }
        });
    }
);