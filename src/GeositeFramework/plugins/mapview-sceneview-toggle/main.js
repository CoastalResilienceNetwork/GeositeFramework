define(
    ["dojo/_base/declare", "framework/PluginBase"],
    function (declare, PluginBase) {
        return declare(PluginBase, {
            toolbarName: "MapView-SceneView Toggle",
            fullName: "Toggle between 2-D and 3-D mode",
            toolbarType: "map",
            allowIdentifyWhenActive: false,
            closeOthersWhenActive: false,

            initialize: function (args) {
                declare.safeMixin(this, args);
            },

            renderLauncher: function () {
                return '<div id="mapview-sceneview-control">' +
                       '<span id="mapview-sceneview-toggle-control-icon">' +
                       '<i class="icon-globe"></i></span></div>';
            },

            activate: function () {
                if (this.app.mapIs2d()) {
                    this.app.activate3d();
                } else {
                    this.app.activate2d();
                }
            },
        });
    }
);
