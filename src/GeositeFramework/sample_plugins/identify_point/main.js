
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

                // add buttons to bind resize events to
                $(this.container).append('<p>The buttons below demonstrate how to use a plugins "resize" method</p>')
                    .append('<button class="resize-btn" data-ui-key="resize-ctl-identify-set450">Set to 450</button>')
                    .append('<button class="resize-btn" data-ui-key="resize-ctl-identify-small">Small</button>')
                    .append('<button class="resize-btn" data-ui-key="resize-ctl-identify-large">Large</button>')
                    .append('<p class="width-textbox"></p>');

                // Hide the print button until the identify feature has been used.
                $(this.printButton).hide();
            },

            activate: function(showHelpOnStart) {
                // Example of how a plugin could show help on startup, but
                // only the first time a user opens the plugin:

                // Show the help on activation, if it has not been suppressed
                if (showHelpOnStart) {
                    this.showHelp();

                    // Don't show this help on startup anymore, after the first time 
                    this.app.suppressHelpOnStartup(true);
                }

                // attach resize events to sample controls, attach actions to jQuery deferred
                var self = this;
                _.each($(self.container).find("button.resize-btn"), function (el) {
                    switch ($(el).data("ui-key")) {
                        case "resize-ctl-identify-set450":
                            $(el).on("click", function() {
                                self.app.resize.setWidth(450).then($(".width-textbox").text("Width is now 450"));
                            });
                            break;
                        case "resize-ctl-identify-large":
                            $(el).on("click", function() {
                                self.app.resize.setWidth("large").then($(".width-textbox").text("Width is now large"));
                            });
                            break;
                        case "resize-ctl-identify-small":
                            $(el).on("click", function() {
                                self.app.resize.setWidth("small").then($(".width-textbox").text("Width is now small"));
                            });
                            break;
                    }
                });
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
