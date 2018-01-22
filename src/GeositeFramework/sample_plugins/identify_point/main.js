require({
    packages: [
        {
            name: "jquery",
            location: "//ajax.googleapis.com/ajax/libs/jquery/1.9.0",
            main: "jquery.min"
        }
    ]
});

define(["dojo/_base/declare", "framework/PluginBase", "dojo/text!./template.html"],
    function (declare, PluginBase, template) {
        return declare(PluginBase, {
            toolbarName: "Identify Point",
            fullName: "Identify point sample plugin",
            hasHelp: true,
            allowIdentifyWhenActive: true,
            size: 'small',
            hasCustomPrint: true,
            usePrintModal: true,
            printModalSize: [500, 200],
            infographic: [500, 300],

            initialize: function(frameworkParameters) {
                declare.safeMixin(this, frameworkParameters);

                this.render(frameworkParameters);
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

                // Call `renderSampleImageModal` method on clicking thumbnail
                $(this.container).find('#sample-plugin-thumbnail').on('click', function() {
                    var modalImageSource = 'sample_plugins/identify_point/FutureHabitat_c.jpg';
                    self.renderSampleImageModal(modalImageSource);
                });

                // Render the range slider using jQueryUI
                $("#sldr")
                    .slider({ min: 0, max: 5, range: false, values: [1] })
                    .slider("pips", { rest: "label"})
                    .slider("float");

                // Render an accordion menu using jQueryUI
                $("#accord").accordion( { heightStyle: "fill" } );
                $("#accord > h3").addClass("accord-header");
                $("#accord > div").addClass("accord-body");

                // Use Chosen to style the multi-select
                $("#chosen-single")
                    .chosen({ allow_single_deselect: true, width:"155px" })
                    .change(function (c) {
                        $('#' + c.target.id)
                            .parent()
                            .next()
                            .find("span")
                            .html(c.target.value || "none");
                    });
           },

            identify: function(mapPoint, clickPoint, processResults) {
                var text = i18next.t("You clicked on latitude %f longitude %f", mapPoint.getLatitude(), mapPoint.getLongitude()),
                    identifyWidth = 300;
                processResults(text, identifyWidth);

                // Make the print button available now.
                $(this.printButton).show();
            },

            prePrintModal: function(preModalDeferred, $printSandbox, $modalSandbox, mapObject) {
                $.get('sample_plugins/identify_point/html/print-form.html', function(html) {
                    $modalSandbox.append(html);
                }).then(preModalDeferred.resolve());

                // Append optional images to print sandbox, which are hidden by default
                $printSandbox.append('<div class="sample"><img id="north-arrow-img" src="sample_plugins/identify_point/north-arrow.png"/></div>');
                $printSandbox.append('<div class="sample"><img id="logo-img" src="sample_plugins/identify_point/tnc-logo.png"/></div>');

                // Zoom and center to Philadelphia, as a demonstration
                this.initialZoom = mapObject.getZoom();
                this.initialCenter = mapObject.extent.getCenter();

                mapObject.centerAndZoom([-75.1641, 39.9562], 8)
            },

            postPrintModal: function(postModalDeferred, $printSandbox, $modalSandbox, mapObject) {
                var includeNorthArrow = $modalSandbox.find('#north-arrow').is(':checked');
                var includeTncLogo = $modalSandbox.find('#tnc-logo').is(':checked');
                var addLayer = $modalSandbox.find('#add-layer').is(':checked');

                if (includeNorthArrow) {
                    $printSandbox.find('#north-arrow-img').show();
                }

                if (includeTncLogo) {
                    $printSandbox.find('#logo-img').show();
                }

                if (addLayer) {
                    if (this.layer) {
                        this.layer.setVisibility(true);
                    } else {
                        this.layer = new esri.layers.ArcGISDynamicMapServiceLayer("http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Demographics/ESRI_Population_World/MapServer", {
                            "opacity": 0.8
                        });

                        mapObject.addLayer(this.layer);
                    }
                }

                window.setTimeout(function() {
                    if (mapObject.updating) {
                        var delayedPrint = mapObject.on('update-end', function() {
                                delayedPrint.remove();
                                postModalDeferred.resolve();
                        });
                    } else {
                        postModalDeferred.resolve();
                    }
                }, 500);
            },

            postPrintCleanup: function(mapObject) {
                // Reset map to initial position
                mapObject.centerAndZoom(this.initialCenter, this.initialZoom);
                if (this.layer) {
                    this.layer.setVisibility(false);
                }
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
            },

            // Use TINY to display a modal image from a path to an image
            renderSampleImageModal: function(imageSourcePath) {
                TINY.box.show({
                    animate: false,
                    html: '<img src="' + imageSourcePath + '"/>',
                    fixed: true,
                });
            },

            render: function(frameworkParameters) {
                $(this.container).append(template);

                if (frameworkParameters.app.singlePluginMode) {
                    $(this.container)
                        .find('#home')
                        .prepend('<h2>Welcome to single plugin mode!</h2>')
                        .append('<button class="plugin-print">Plugin print demo</button>');

                }
            }
        });
    }
);
