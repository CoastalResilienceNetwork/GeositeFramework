
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
            previewMapSize: [500, 350],
            icon: 'info-2',

            initialize: function(args) {
                declare.safeMixin(this, args);
                $(this.container).append(
                    '<h4 style="padding: 5px;">' + i18next.t('Click any point on the map to display Latitude and Longitude') + '</h4>');

                // Hide the print button until the identify feature has been used.
                $(this.printButton).hide();
            },

            identify: function(mapPoint, clickPoint, processResults) {
                var text = i18next.t("You clicked on latitude %f longitude %f", mapPoint.getLatitude(), mapPoint.getLongitude()),
                    identifyWidth = 300;
                processResults(text, identifyWidth);

                // Make the print button available now.
                $(this.printButton).show();

            },

            beforePrint: function(printDeferred, $printArea, mapObject) {
                var layer = new esri.layers.ArcGISDynamicMapServiceLayer("http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Demographics/ESRI_Population_World/MapServer", {
                        "opacity": 0.8
                    });

                mapObject.addLayer(layer);

                $printArea.append('<img id="sample-graphic-print" src="' + this.infoGraphic + '" >');

                printDeferred.resolve();
            }
        });
    }
);
