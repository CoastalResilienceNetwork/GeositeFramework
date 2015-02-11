define(
    ["dojo/_base/declare", "framework/PluginBase"],
    function (declare, PluginBase) {
        return declare(PluginBase, {
            toolbarName: "Subregion Toggle",
            fullName: "Show and hide subregion areas on the map",
            toolbarType: "map",
            allowIdentifyWhenActive: true,
            closeOthersWhenActive: false,

            initialize: function (args) {
                declare.safeMixin(this, args);
            },

            renderLauncher: function () {
                return '<div class="subregion-toggle"></div>';
            },

            activate: function () {
                var mapId = this.map.getMapId();
                this.app.dispatcher.trigger('subregion-toggle:toggle', mapId);
            }
        });
    }
);