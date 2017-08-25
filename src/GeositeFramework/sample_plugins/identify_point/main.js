require({
    packages: [
        {
            name: "jquery",
            location: "//ajax.googleapis.com/ajax/libs/jquery/1.9.0",
            main: "jquery.min"
        }
    ]
});

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

            initialize: function(frameworkParameters) {
                declare.safeMixin(this, frameworkParameters);

                if (frameworkParameters.app.singlePluginMode) {
                    $(this.container).append('<h2>Welcome to single plugin mode!</h2>');
                }

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

                // Display a clickable image thumbnail
                $(this.container)
                    .append('<p>Click the thumbnail to see a sample modal image popup</p>')
                    .append('<img src="sample_plugins/identify_point/FutureHabitat_c.jpg"' +
                            'id="sample-plugin-thumbnail" style="cursor: pointer" width="200" height="120" />');

                // Select box using Chosen
                $(this.container)
                    .append('<p>An example select box using Chosen</p>' +
                            '<div class="chosen-wrap" style="margin-bottom:10px; margin-left:10px">' +
                            '<select data-placeholder="Pick One Number" id="chosen-single"' +
                            'class="chosen">' +
                            '<option></option>' +
                            '<option value="one">One</option>' +
                            '<option value="two">Two</option>' +
                            '<option value="three">Three</option>' +
                            '</select>' +
                            '</div>' +
                            '<p>Selected value: <span class="blueFont">none</span></p>');

                // Slider using jQueryUI
                $(this.container)
                    .append('<p>An example slider using jQueryUI</p>' +
                            '<div class="slider-container" style="width:250px; margin-left: 10px;">' +
                            '<div id="sldr" class="slider"></div>' +
                            '</div>');

                // Accordion menu using jQueryUI
                $(this.container)
                    .append('<p>An example accordion menu using jQueryUI</p>' +
                            '<div class="accord" style="height:200px; width:350px;' +
                            'margin-bottom:10px;">' +
                            '<div id="accord">' +
                            '<h3>First Panel</h3>' +
                            '<div>' +
                            '<p>Lorem ipsum dolor sit amet, consectetur...</p>' +
                            '<p>Ut enim ad minim veniam, quis nostrud...</p>' +
                            '<p>Duis aute irure dolor in reprehenderit...</p>' +
                            '</div>' +
                            '<h3>Second Panel</h3>' +
                            '<div>' +
                            '<p>Lorem ipsum dolor sit amet, consectetur...</p>' +
                            '<p>Ut enim ad minim veniam, quis nostrud...</p>' +
                            '</div></div>');
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
            },

            // Use TINY to display a modal image from a path to an image
            renderSampleImageModal: function(imageSourcePath) {
                TINY.box.show({
                    animate: false,
                    html: '<img src="' + imageSourcePath + '"/>',
                    fixed: true,
                });
            }
        });
    }
);
