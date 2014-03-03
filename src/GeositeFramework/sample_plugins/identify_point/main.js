
define(["dojo/_base/declare", "framework/PluginBase"],
    function (declare, PluginBase) {
        return declare(PluginBase, {
            toolbarName: "Identify Point",
            fullName: "Identify point sample plugin",
            infoGraphic: "sample_plugins/identify_point/splash.png",
            allowIdentifyWhenActive: true,
            resizable: true,
            width: 300,
            height: 200,

            initialize: function(args) {
                declare.safeMixin(this, args);
                $(this.container).append('<h4>Click any point on the map to display Latitude and Longitude</h4>');
                $(this.container).append('<div class="last-result"></div>');
            },

            identify: function(mapPoint, clickPoint, processResults) {
                var $lastResult = $('.last-result', this.container);
                $lastResult.html("<p>You clicked on latitude " + mapPoint.getLatitude() + " longitude " + mapPoint.getLongitude() + "</p>");
                processResults(false);
            }
        });
    }
);
