
define(["dojo/_base/declare", "framework/PluginBase"],
    function (declare, PluginBase) {
        return declare(PluginBase, {
            toolbarName: "Identify Point",
            fullName: "Identify point sample plugin",
            infoGraphic: "sample_plugins/identify_point/splash.png",
            allowIdentifyWhenActive: true,
            resizable: false,
            width: 320,
            height: 'auto',

            initialize: function(args) {
                declare.safeMixin(this, args);
                $(this.container).append('<h4 style="padding: 5px;">Click any point on the map to display Latitude and Longitude</h4>');
            },

            identify: function(mapPoint, clickPoint, processResults) {
                var text = "You clicked on latitude " + mapPoint.getLatitude() + " longitude " + mapPoint.getLongitude(),
                    identifyWidth = 300;
                processResults(text, identifyWidth);
            }
        });
    }
);
