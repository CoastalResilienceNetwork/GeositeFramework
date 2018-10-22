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

                if (this.app.regionConfig.subregions.hideByDefault) {
                    this.activate();
                }
            },

            renderLauncher: function () {
                return '<div class="' + this.getClassName() + '"></div>';
            },

            activate: function () {
                var mapId = this.map.getMapId();
                this.app.dispatcher.trigger('subregion-toggle:toggle', mapId);
            },
            
            validate: function(regionData) {
                // This plugin is only valid if there are subregions present in the config
                return !!regionData.subregions || !_.isEmpty(regionData.subregions);
            },

            getClassName: function() {
                return 'subregion-toggle';
            },

            subregionActivated: function(subregion, pane) {
                $('#map-' + pane.get('paneNumber')).find('.' + this.getClassName()).hide();
            },

            subregionDeactivated: function(subregion, pane) {
                $('#map-' + pane.get('paneNumber')).find('.' + this.getClassName()).show();
            }

        });
    }
);