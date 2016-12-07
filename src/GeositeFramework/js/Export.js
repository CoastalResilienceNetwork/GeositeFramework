/*global Backbone, _, $ */

require(['use!Geosite'],
    function(N) {
    "use strict";
        function render(view) {
            $('#plugin-print-sandbox').empty();
            $('.plugin-print-css').remove();
            $('.base-plugin-print-css').remove();
            $('<link>', {
                rel: 'stylesheet',
                href: 'css/app-print.css',
                'class': '.app-print-css' 
            }).appendTo('head');
            var html = N.app.templates['template-export-window']();
            view.$el.empty().append(html);
            if (view.$uiContainer) {
                view.$uiContainer.show();
            }

            return view;
        }

        function createUiContainer(view) {
            var model = view.model,
                $uiContainer = $($.trim(N.app.templates['template-export-window']({id: 'export-print-preview'})));

            view.$uiContainer = $uiContainer;

            // Attach to top pane element
            view.$el.parents().find('.content .nav-apps').after($uiContainer);

            // Tell the model about $uiContainer so it can pass it to the plugin object
            model.set('$uiContainer', $uiContainer);
        }

        function setupPrintableMap() {
            var mapMarkup = N.app.templates['template-export-window']({pluginName: "Test"}),
                $mapPrint = $($.trim(mapMarkup)),
                $printPreview = $('#print-preview-sandbox'),
                mapReadyDeferred = $.Deferred(),
                mapNodeParent = $("#map-0")[0].parentElement;

            // Setup a print-preview window for the user to select an extent and zoom level
            // that will be persisted at print due to its fixed size.
            
            TINY.box.show({
                animate: false,
                html: $mapPrint[0].outerHTML,
                boxid: 'export-print-preview-container',
                width: 400,
                height: 400,
                fixed: true,
                maskopacity: 40,
                openjs: function () {
                    $('#export-button').on('click', function() {
                        var $printSandbox = $('#map-print-sandbox'),
                            previewDeferred = $.Deferred();

                        $('.print-sandbox-header h1').text($("#export-title").val());
                        var mapNode = $("#map-0").detach()[0];
                        $("#export-print-preview-map").append(mapNode);

                        mapReadyDeferred.then(function () {
                            $("#export-print-preview-map").detach().appendTo($("#print-map-container"));

                            if ($("[name='export-include-legend']").is(":checked")) {
                                // show & expand all legend items
                                $("#legend-container-0").css({ visibility: "visible" });
                                _.each(
                                    $(".item.expand>.expand-legend"),
                                    function (el) {
                                        el.click();
                                    });
                                $(".item.extra.collapse").hide();

                                // wrap all items in a div to style separately from header
                            } else {
                                // if the style rule is changed via jquery, that state seems to
                                // "stick", regardless of what's in the stylesheet
                                $("#legend-container-0").css({ visibility: "hidden" });
                            }
                            var pageOrientation = $("[name='export-orientation']").filter(function () { return this.checked; }).map(function () { return this.value; }).first()[0];
                            var orientDeferred = $.Deferred();

                            if (pageOrientation === "Landscape") {
                                $('<link>', {
                                    rel: 'stylesheet',
                                    href: 'css/print-landscape.css',
                                    'class': '.print-orientation-css',
                                }).appendTo('head');
                                _.delay(orientDeferred.resolve, 750);
                                $(".legend-layer").each(function(el) { $(this).children(".item").wrapAll("<div class='print-legend-coll'></div>"); });
                            } else {
                                $('<link>', {
                                    rel: 'stylesheet',
                                    href: 'css/print-portrait.css',
                                    'class': '.print-orientation-css',
                                }).appendTo('head');
                                _.delay(orientDeferred.resolve, 750);
                            }

                            $.when(orientDeferred).then(function() {
                                window.print();
                                previewDeferred.resolve();
                            });
                        });

                        previewDeferred.then(function () {
                            $(".item.extra.collapse").show();
                            TINY.box.hide();
                            $printPreview.hide();
                        });
                    });

                    mapReadyDeferred.resolve();
                },
                closejs: function() {
                    var mapNode = $("#map-0").detach()[0];
                    mapNodeParent.append(mapNode);
                    $("#export-print-preview-map").detach().appendTo($("#export-print-preview-container"));
                    $('.app-print-css').remove();
                    $("#legend-container-0").css({ visibility: "visible" });
                }
            });
            
            return mapReadyDeferred;
        }

    ////////////////////////////////
    // MODEL CLASS
    ////////////////////////////////

    N.models.ExportTool = Backbone.Model.extend({
        defaults: {
            // set by view, listened internally
            exportTitle: "",
            exportOrientation: null,
            exportIncludeLegend: false,
            outputText: ""
        },

        submitExport: function() {
            if (!this.submissionIsValid()) {
                this.set('outputText', i18next.t("Please enter all required fields."));
            }
        },

        submissionIsValid: function () {
            return _.contains(["Portrait", "Landscape"], this.get('exportOrientation'));
        }
    });

    ////////////////////////////////
    // VIEW CLASS
    ////////////////////////////////

    N.views.ExportTool = Backbone.View.extend({
        tagName: 'div',
        className: 'export-ui',
        previewDeferred: $.Deferred(),


        events: {
            "click #export-button": function () { this.handleSubmit(); },
            "keyup input": function (event) { this.handleKeyPress(event); }
        },

        handleKeyPress: function (event) {
            var keycode = (event.keyCode ? event.keyCode : null);
            if (keycode === 13) { this.handleSubmit(); }
        },

        initialize: function () {
            var view = this;

            view.listenTo(view.model, "change:outputText", function () {
                view.$(".export-output-area").html(view.model.get('outputText'));
            });

            view.paneNumber = 0;

            var mapReadyDeferred = setupPrintableMap(this.model, $("#map-print-sandbox"), this.previewDeferred);
            createUiContainer(view, 0, view.previewDeferred, mapReadyDeferred);
        },

        render: function () {
            var view = this,
                body = N.app.templates['template-export-window']();
            
            this.$el
                .empty()
                .append(body);

            if ($.i18n) {
                $(this.$el).localize();
            }

            return render(view);
        },
    });
});
