/*global Backbone, _, $ */

require(['use!Geosite'],
    function(N) {
        "use strict";

        function addAppPrintCSSFile() {
            $('<link>', {
                rel: 'stylesheet',
                href: 'css/app-print.css',
                'class': 'app-print-css'
            }).appendTo('head');
        }

        function addPagePrintCSSFile(debugOptions) {
            var pageOrientation,
                pageSize;

            if (!debugOptions) {
                pageOrientation = $("[name='export-orientation']:checked").val();
                pageSize = $("[name='export-page-size']:checked").val();
            } else {
                pageOrientation = debugOptions.pageOrientation;
                pageSize = debugOptions.pageSize;
            }

            $('<link>', {
                rel: 'stylesheet',
                href: pageCssLink(pageOrientation, pageSize),
                'class': 'print-orientation-css',
            }).appendTo('head');
        }

        function removeAppPrintCSSFile() {
            $('.app-print-css').remove();
        }

        function removePagePrintCSSFile() {
            $('.print-orientation-css').remove();
        }

        function render(view) {
            $('#plugin-print-sandbox').empty();
            $('.plugin-print-css').remove();
            $('.base-plugin-print-css').remove();
            addAppPrintCSSFile();

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

        function isChrome() {
            if (window.onafterprint === undefined) {
                return true;
            }
            return false;
        }

        function pageCssLink(pageOrientation, pageSize) {
            return 'css/print-' + pageSize + "-" + pageOrientation + '.css';
        }

        function invalidateSize(map) {
            map.resize();
            map.reposition();
        }

        function moveScaleBarAboveLegendForPrint() {
            $(".esriScalebar").addClass("above-legend");
            $(".esriControlsBR").addClass("above-legend");
        }

        function moveScaleBarToPageBottomForPrint() {
            $(".esriScalebar").toggleClass("page-bottom");
            $(".esriControlsBR").toggleClass("page-bottom");
        }

        function restoreScaleBarAfterPrint() {
            $(".esriScalebar").removeClass("above-legend");
            $(".esriScalebar").removeClass("page-bottom");
            $(".esriControlsBR").removeClass("above-legend");
            $(".esriControlsBR").removeClass("page-bottom");
        }

        function createPrintableMap(
            context, previewDeferred, orientDeferred, resizeDeferred, legendDeferred, postPrintAction, debug
        ) {
            var mapNode = $("#map-0").detach();
            var exportMap = $("#export-print-preview-map");

            $('.print-sandbox-header h1').text($("#export-title").val());
            exportMap.append(mapNode);
            invalidateSize(context.map);

            context.mapReadyDeferred.then(function() {
                exportMap.detach().appendTo($("#print-map-container"));
                invalidateSize(context.map);
            });

            addPagePrintCSSFile(debug);

            _.delay(orientDeferred.resolve, 1000);

            orientDeferred.then(function() {
                context.map.width = parseFloat(exportMap.css("width"));
                context.map.height = parseFloat(exportMap.css("height"));
                invalidateSize(context.map);
                context.map.centerAt(context.mapDimensions.extent.getCenter());
                _.delay(resizeDeferred.resolve, 1000);
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

                if (($("[name='export-include-legend']").is(":checked") &&
                     context.legend.css("display") !== "none") || !!debug) {
                    // show & expand all legend items
                    context.legend.css({ visibility: "visible" });
                    $(".item.expand>.expand-legend").click();
                    $(".item.extra.collapse").hide();
                    moveScaleBarAboveLegendForPrint();
                } else {
                    // if the style rule is changed via jquery, that state seems to
                    // "stick", regardless of what's in the stylesheet
                    context.legend.css({ visibility: "hidden" });
                    moveScaleBarToPageBottomForPrint();
                }

                _.delay(legendDeferred.resolve, 1000);
            });

            function afterPrintHandler() {
                _.delay(previewDeferred.resolve, 250);
            }

            $.when(orientDeferred, legendDeferred, resizeDeferred)
                .then(function () {
                /*
                    Chrome's exposed 'window.print' method includes a preview and
                    blocks, whereas non-Chrome browsers do neither; similarly,
                    Chrome does not expose an 'onafterprint' event while the
                    others do.
                */

                if (!!debug) {
                    return _.noop();
                }

                if (!isChrome()) {
                    window.onafterprint = afterPrintHandler;
                }

                window.print();

                if (isChrome()) {
                    previewDeferred.resolve();
                }
            });

            previewDeferred.then(function() {
                $(".item.extra.collapse").show();
                TINY.box.hide();
                postPrintAction();
            });
        }

        function setupExport(context, debugOptions) {
            var previewDeferred = $.Deferred(),
                orientDeferred = $.Deferred(),
                resizeDeferred = $.Deferred(),
                legendDeferred = $.Deferred(),
                postPrintAction = _.noop;

            $('#export-button').on('click', function() {
                return createPrintableMap(
                    context,
                    previewDeferred,
                    orientDeferred,
                    resizeDeferred,
                    legendDeferred,
                    postPrintAction,
                    debugOptions
                );
            });

            context.mapReadyDeferred.resolve();
        }

        function destroyExport(context, debugOptions) {
            if (!!debugOptions) {
                return _.noop();
            }

            var restoreMapDeferred = $.Deferred(),
                restoreCssDeferred = $.Deferred(),
                restoreNodeDeferred = $.Deferred(),
                exportMap = $("#export-print-preview-map"),
                exportContainer = $("#export-print-preview-container");

            removeAppPrintCSSFile();
            removePagePrintCSSFile();

            context.legend.css({ visibility: "visible" });
            _.delay(restoreCssDeferred.resolve, 1000);

            restoreCssDeferred.then(function() {
                var mapNode = $("#map-0").detach();
                context.mapNodeParent.append(mapNode);
                exportMap.detach().appendTo(exportContainer);
                invalidateSize(context.map);
                $(".esriScalebar").removeClass("above-legend");
                $(".esriScalebar").removeClass("page-bottom");
                $(".esriControlsBR").removeClass("above-legend");
                $(".esriControlsBR").removeClass("page-bottom");
                _.delay(restoreNodeDeferred.resolve, 1000);
            });

            restoreNodeDeferred.then(function() {
                context.map.width = context.mapDimensions.width;
                context.map.height = context.mapDimensions.height;
                invalidateSize(context.map);
                _.delay(restoreMapDeferred.resolve, 250);
            });

            restoreMapDeferred.then(function() {
                context.map.setZoom(context.mapDimensions.zoom);
                context.map.setExtent(context.mapDimensions.extent);
                context.map.centerAt(context.mapDimensions.extent.getCenter());
            });

            return _.noop();
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

            var debugQueryString = new URLSearchParams(window.location.search),
                isPrintDebugMode = debugQueryString.get('debug') === 'true',
                debugPageSize = debugQueryString.get('size'),
                debugPageOrientation = debugQueryString.get('orientation'),
                debugOptions = null;

            var context = {
                mapReadyDeferred: mapReadyDeferred,
                map: map,
                mapDimensions: mapDimensions,
                mapElement: mapElement,
                mapNodeParent: mapNodeParent,
                legend: legend,
            };

            if (isPrintDebugMode) {
                if (!['a4', 'letter'].includes(debugPageSize)) {
                    window.console.warn('Invalid pageSize: expected "letter" or "a4"');
                    return null;
                }

                if (!['portrait', 'landscape'].includes(debugPageOrientation)) {
                    window.console.warn('Invalid pageOrientation: expected "portrait" or "landscape"');
                    return null;
                }

                debugOptions = {
                    pageSize: debugPageSize,
                    pageOrientation: debugPageOrientation,
                };
            }

            TINY.box.show({
                animate: false,
                html: $mapPrint[0].outerHTML,
                boxid: 'export-print-preview-container',
                width: 400,
                height: 500,
                fixed: true,
                maskopacity: 40,
                openjs: function () {
                    setupExport(context, debugOptions);
                },
                closejs: function () {
                    destroyExport(context, debugOptions);
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
            view.paneNumber = 0;

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
