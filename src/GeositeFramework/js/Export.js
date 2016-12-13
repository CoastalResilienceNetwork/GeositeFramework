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

        function pageCssLink(pageOrientation) {
            if (pageOrientation === 'Landscape') {
                return 'css/print-landscape.css';
            } else {
                return 'css/print-portrait.css';
            }
        }

        function setupExport(context) {
            var previewDeferred = $.Deferred(),
                orientDeferred = $.Deferred(),
                resizeDeferred = $.Deferred(),
                postPrintAction = _.noop;

            $('#export-button').on('click', function() {
                var mapNode = $("#map-0").detach();
                var exportMap = $("#export-print-preview-map");

                $('.print-sandbox-header h1').text($("#export-title").val());
                exportMap.append(mapNode);

                context.mapReadyDeferred.then(function() {
                    exportMap.detach().appendTo($("#print-map-container"));
                });

                var pageOrientation = $("[name='export-orientation']:checked").val();
                $('<link>', {
                    rel: 'stylesheet',
                    href: pageCssLink(pageOrientation),
                    'class': '.print-orientation-css',
                }).appendTo('head');
                _.delay(orientDeferred.resolve, 500);

                orientDeferred.then(function() {
                    context.map.width = parseFloat(exportMap.css("width"));
                    context.map.height = parseFloat(exportMap.css("height"));
                    context.map.resize(true);
                    context.map.centerAt(context.mapDimensions.extent.getCenter());
                    _.delay(resizeDeferred.resolve, 500);
                });

                // the legend items are affected by the map resize, so
                // they are manipulated just before printing
                resizeDeferred.then(function() {
                    // expand legend container if minimized
                    if (context.legend.hasClass("minimized")) {
                        $(".legend-close").click();
                        postPrintAction = function() {
                            $(".legend-close").click();
                        };
                    }

                    if ($("[name='export-include-legend']").is(":checked")) {
                        // show & expand all legend items
                        context.legend.css({ visibility: "visible" });
                        $(".item.expand>.expand-legend").click();
                        $(".item.extra.collapse").hide();

                    } else {
                        // if the style rule is changed via jquery, that state seems to
                        // "stick", regardless of what's in the stylesheet
                        context.legend.css({ visibility: "hidden" });
                    }
                    // wrap all legend items in a div to style separately from header
                    $(".legend-layer").each(
                        function(el) {
                            $(this)
                                .children(".item")
                                .wrapAll("<div class='print-legend-coll'></div>");
                        });

                    window.print();
                    previewDeferred.resolve();
                });

                previewDeferred.then(function() {
                    $(".item.extra.collapse").show();
                    TINY.box.hide();
                    printPreview.hide();
                    postPrintAction();
                });
            });

            context.mapReadyDeferred.resolve();
        }

        function destroyExport(context) {
            var restoreMapDeferred = $.Deferred(),
                restoreCssDeferred = $.Deferred(),
                restoreNodeDeferred = $.Deferred(),
                exportMap = $("#export-print-preview-map"),
                exportContainer = $("#export-print-preview-container");

            $('.app-print-css').remove();
            $('.print-orientation-css').remove();

            context.legend.css({ visibility: "visible" });
            _.delay(restoreCssDeferred.resolve, 500);

            restoreCssDeferred.then(function() {
                var mapNode = $("#map-0").detach();
                context.mapNodeParent.append(mapNode);
                exportMap.detach().appendTo(exportContainer);
                _.delay(restoreNodeDeferred.resolve, 500);
            });
            restoreNodeDeferred.then(function() {
                context.map.width = context.mapDimensions.width;
                context.map.height = context.mapDimensions.height;
                context.map.resize(true);
                _.delay(restoreMapDeferred.resolve, 250);
            });

            restoreMapDeferred.then(function() {
                context.map.setZoom(context.mapDimensions.zoom);
                context.map.setExtent(context.mapDimensions.extent);
                context.map.centerAt(context.mapDimensions.extent.getCenter());
            });
        }

        function showMapExportModal(model) {
            var mapMarkup = N.app.templates['template-export-window']({ pluginName: "Test" }),
                $mapPrint = $($.trim(mapMarkup)),
                mapReadyDeferred = $.Deferred(),
                map = model.get('esriMap'),
                mapElement = $("#map-0"),
                mapNodeParent = $("#map-0").parent(),
                legend = $("#legend-container-0"),
                mapDimensions = {
                    width: map.width,
                    height: map.height,
                    extent: map.extent,
                    zoom: map.getZoom(),
                };

            var context = {
                mapReadyDeferred: mapReadyDeferred,
                map: map,
                mapDimensions: mapDimensions,
                mapElement: mapElement,
                mapNodeParent: mapNodeParent,
                legend: legend,
            };

            TINY.box.show({
                animate: false,
                html: $mapPrint[0].outerHTML,
                boxid: 'export-print-preview-container',
                width: 400,
                height: 400,
                fixed: true,
                maskopacity: 40,
                openjs: function () {
                    setupExport(context);
                },
                closejs: function () {
                    destroyExport(context);
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
            var model = this.model;
            var map = model.get('esriMap');

            var mapReadyDeferred = showMapExportModal(this.model, $("#map-print-sandbox"), this.previewDeferred);
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
