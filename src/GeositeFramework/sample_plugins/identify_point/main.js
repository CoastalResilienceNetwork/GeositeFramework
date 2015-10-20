
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
            hasCustomPrint: true,
            usePrintPreviewMap: true,

            initialize: function(args) {
                declare.safeMixin(this, args);
                $(this.container).append(
                    '<h4 style="padding: 5px;">Click any point on the map to display Latitude and Longitude</h4>');
            },

            identify: function(mapPoint, clickPoint, processResults) {
                var text = "You clicked on latitude " + mapPoint.getLatitude() + " longitude " + mapPoint.getLongitude(),
                    identifyWidth = 300;
                processResults(text, identifyWidth);
            },

            beforePrint: function(printDeferred, $printArea, mapObject) {
                var layer = new esri.layers.ArcGISDynamicMapServiceLayer("http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Demographics/ESRI_Population_World/MapServer", {
                        "opacity": 0.8
                    });
                
                mapObject.addLayer(layer);
                mapObject.centerAt(new esri.geometry.Point(-118.15, 33.80));
                mapObject.setZoom(5);

                $printArea.append('<img id="sample-graphic-print" src="' + this.infoGraphic + '" >');

                printDeferred.resolve();
            }
        });
    }
);
