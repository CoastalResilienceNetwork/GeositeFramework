
define(["dojo/_base/declare", "framework/PluginBase"],
    function (declare, PluginBase) {
        return declare(PluginBase, {
            toolbarName: "Identify Point",
            fullName: "Identify point sample plugin",
            hasHelp: true,
            allowIdentifyWhenActive: true,
            size: 'small',
            hasCustomPrint: true,
            usePrintPreviewMap: true,
            previewMapSize: [500, 350],

            initialize: function(args) {
                declare.safeMixin(this, args);
                $(this.container).append(
                    '<h4 style="padding: 5px;">' + i18next.t('Click any point on the map to display Latitude and Longitude') + '</h4>');

                // Hide the print button until the identify feature has been used.
                $(this.printButton).hide();
            },

            activate: function(showHelpOnStart) {
                // Example of how a plugin could show help on startup, but
                // only the first time a user opens the plugin:

                // Show the help on activation, if it has not been supressed
                if (showHelpOnStart) {
                    this.showHelp();

                    // Don't show this help on startup anymore, after the first time 
                    this.app.supressHelpOnStartup(true);
                }
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
            },

            showHelp: function() {
                // Show a generic help and dismissal button
                var self = this;
                if (self.$helpMsg) {
                    self.$helpMsg.remove();
                }

                self.$helpMsg = $("<div>Help: Click the map to see the point </div>");

                $("<a>", {
                    className: "button",
                    href: '#',
                    text: "Got it",
                    click: function() {
                        self.$helpMsg.remove();
                    }
                }).appendTo(self.$helpMsg);

                $(this.container).append(self.$helpMsg);
            }
        });
    }
);
