define(
    ["dojo/_base/declare", "framework/PluginBase"],
    function (declare, PluginBase) {

        return declare(PluginBase, {
            toolbarName: "LegendDisplay",
            fullName: "Show/Hide the map legend",
            toolbarType: "map",
            allowIdentifyWhenActive: true,
            closeOthersWhenActive: false,

            initialize: function (args) {
                declare.safeMixin(this, args);
                this.$legendEl = $(this.legendContainer).parents('.legend');
            },
            
            renderLauncher: function () {
                return '<div class="legend-display"></div>';
            },

            activate: function () {
                this.$legendEl.toggle();
            }
        });
    }
);