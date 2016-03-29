require({
    packages: [
        {
            name: "jquery",
            location: "//ajax.googleapis.com/ajax/libs/jquery/1.9.0",
            main: "jquery.min"
        },
        {
            name: "underscore",
            location: "//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.4.4",
            main: "underscore-min"
        }
    ]
});

define(["dojo/_base/declare",
        "dojo/Deferred",
        "dojo/promise/all",
        "esri/graphic",
        "esri/geometry/jsonUtils",
        "esri/layers/GraphicsLayer",
        "esri/symbols/SimpleFillSymbol",
        "esri/tasks/Geoprocessor",
        "esri/tasks/FeatureSet",
        "esri/toolbars/draw",
        "dojo/text!./templates.html",
        "dojo/i18n!esri/nls/jsapi"
    ],
    function(declare,
             Deferred,
             all,
             Graphic,
             geometryJsonUtils,
             GraphicsLayer,
             SimpleFillSymbol,
             Geoprocessor,
             FeatureSet,
             Draw,
             templates,
             esriText) {
        "use strict";

        return declare(null, {
            constructor: function(parentPlugin, container) {
                var self = this;

                this.app = parentPlugin.app;
                this.map = parentPlugin.map;
                this.parentPlugin = parentPlugin;
                this.container = container;

                this.pluginTmpl = _.template(this.getTemplateById('plugin'));

                this.featureGroup = new GraphicsLayer({
                    id: 'analysis-draw'
                });
                this.map.addLayer(this.featureGroup);
                this.editBar = new Draw(this.map);

                this.bindEvents();
            },

            // Translate the built-in draw tool text
            setupDrawingText: function() {
                var drawText = esriText.toolbars.draw,
                    props = ['start', 'resume', 'complete'];

                _.each(props, function(prop) {
                    drawText[prop] = i18next.t(drawText[prop]);
                });
            },

            bindEvents: function() {
                var self = this;

                $(this.container)
                    .on('click', '.start-drawing', function() {
                        self.onDrawStart();
                    })
                    .on('click', '.cancel-drawing', function() {
                        self.onDrawCancel();
                    })
                    .on('click', '.button-download', function() {
                        var report = self.generateReport();
                        self.app.downloadAsCsv(report.filename, report.rows);
                    });

                dojo.connect(this.editBar, 'onDrawEnd', this.onDrawEnd.bind(this));
            },

            getTree: function() {
                return this.parentPlugin.tree;
            },

            deactivate: function() {
                this.editBar.deactivate();
                this.isDrawing = false;
            },

            hibernate: function() {
                this.clearAll();
                this.deactivate();
            },

            // Return area of interest as JSON.
            getAreaOfInterest: function() {
                return this.areaOfInterest;
            },

            // Return area of interest as ESRI Graphic.
            getAreaOfInterestFeature: function() {
                var areaOfInterest = this.getAreaOfInterest();
                if (areaOfInterest) {
                    var symbol = new SimpleFillSymbol(),
                        geometry = geometryJsonUtils.fromJson(areaOfInterest),
                        feature = new Graphic(geometry, symbol);
                    return feature;
                }
                return null;
            },

            setAreaOfInterest: function(areaOfInterest) {
                this.areaOfInterest = areaOfInterest;
            },

            setState: function(state) {
                this.setAreaOfInterest(state.areaOfInterest);
                this.queueRequestReport();
                this.render();
            },

            getState: function() {
                return {
                    areaOfInterest: this.getAreaOfInterest()
                };
            },

            onDrawStart: function() {
                this.setupDrawingText();
                this.onDrawCancel();
                this.isDrawing = true;
                this.parentPlugin.allowIdentifyWhenActive = false;
                this.featureGroup.clear();
                this.editBar.activate(Draw.POLYGON);
                this.render();
            },

            onDrawEnd: function(geometry) {
                this.onDrawCancel();
                this.setAreaOfInterest(geometry.toJson());
                this.queueRequestReport();
                this.render();
            },

            onDrawCancel: function() {
                this.isDrawing = false;
                this.parentPlugin.allowIdentifyWhenActive = true;
                this.editBar.deactivate();
                this.setAreaOfInterest(null);
                this.setReportData(null);
                this.render();
            },

            // Format: [ { layer: {...},
            //             reports: { reportLayer: {...}, rows: [] } }, ... ]
            getReportData: function() {
                return this.reportData;
            },

            setReportData: function(data) {
                this.reportData = data;
            },

            // Return rows for CSV export.
            generateReport: function() {
                var result = [];

                // Header
                result.push(['layer', 'feature', 'category', 'amount', 'units']);

                _.each(this.getReportData(), function(item) {
                    var layer = item.layer;
                    if (item.reports.error) {
                        return;
                    }
                    _.each(item.reports, function(report) {
                        var reportLayer = report.reportLayer;
                        _.each(report.rows, function(row) {
                            result.push([
                                layer.getDisplayName(),
                                reportLayer.display,
                                reportLayer.field,
                                reportLayer.units,
                                row.Category,
                                row.Amount
                            ]);
                        });
                    });
                });

                return {
                    filename: 'report.csv',
                    rows: result
                };
            },

            // Queue the next request to obtain report results.
            // Prevents simultaneous requests from conflicting when many
            // layers are toggled at once.
            queueRequestReport: function() {
                this.currentReportRequestId = _.uniqueId();
                this.requestReport(this.currentReportRequestId);
            },

            requestReport: function(requestId) {
                var areaOfInterestFeature = this.getAreaOfInterestFeature();
                if (!areaOfInterestFeature) {
                    return;
                }

                var featureSet = new FeatureSet();
                featureSet.features = [areaOfInterestFeature];

                var self = this,
                    layers = this.getActiveLayers(),
                    zipLayers = _.bind(this.zipLayers, this, layers),
                    requestLayerReport = _.bind(this.requestLayerReport, this, featureSet),
                    promise = all(_.map(layers, requestLayerReport));

                this.showSpinner();

                // All promises should complete "successfully", even if they
                // complete with an error message. This way, we can display
                // results for reports that did not fail instead of
                // short-circuiting.
                promise
                    .then(zipLayers)
                    .then(function(reportData) {
                        if (self.currentReportRequestId !== requestId) {
                            return;
                        }
                        self.setReportData(reportData);
                        self.hideSpinner();
                        self.render();
                    });
            },

            // Return a promise that resolves when the geoprocessing job
            // has completed or failed.
            requestLayerReport: function(featureSet, layer) {
                var self = this,
                    defer = new Deferred(),
                    server = layer.getServer(),
                    reportGpUrl = server.reportGpUrl,
                    reportLayers = layer.getReportLayers(),
                    gp = new Geoprocessor(reportGpUrl),
                    params = {
                        'Layers': JSON.stringify(reportLayers),
                        'Clip': featureSet
                    };

                if (!reportLayers.length) {
                    defer.resolve({
                        error: 'No reports have been configured for this layer.'
                    });
                    return defer;
                }

                gp.submitJob(params, function(info) {
                    if (info.jobStatus === 'esriJobSucceeded') {
                        gp.getResultData(info.jobId, 'Output', function(gpResult) {
                            var reportResult = self.zipReportLayers(reportLayers, gpResult.value);
                            defer.resolve(reportResult);
                        }, function(error) {
                            defer.resolve({
                                error: error
                            });
                        });
                    } else {
                        var messages = _.reduce(info.messages, function(acc, message) {
                            return acc + message.description + ' \n';
                        }, '');
                        self.app.error('Unable to process Report Analysis', messages);
                        defer.resolve({
                            error: messages
                        });
                    }
                }, null, function(error) {
                    self.app.error('Unable to process Report Analysis', error);
                    defer.resolve({
                        error: error
                    });
                });

                return defer;
            },

            // Associate a report layer with its corresponding result rows.
            zipReportLayers: function(reportLayers, gpResultRows) {
                var result = [];
                for (var i = 0; i < reportLayers.length; i++) {
                    result.push({
                        reportLayer: reportLayers[i],
                        rows: gpResultRows[i]
                    });
                }
                return result;
            },

            // Associate a layer with its corresponding report results.
            zipLayers: function(layers, reportResults) {
                var result = [];
                for (var i = 0; i < layers.length; i++) {
                    var layer = layers[i],
                        reportResult = reportResults[i];
                    result.push({
                        layer: layer,
                        reports: reportResult
                    });
                }
                return result;
            },

            showSpinner: function() {
                this.isLoading = true;
                this.render();
            },

            hideSpinner: function() {
                this.isLoading = false;
                this.render();
            },

            getActiveLayers: function() {
                return this.getTree().getSelectedLeafNodes();
            },

            // Called when layers are toggled.
            update: function() {
                this.clearAll();
                this.queueRequestReport();
                this.render();
            },

            clearAll: function() {
                this.setReportData(null);
                this.setAreaOfInterest(null);
                this.featureGroup.clear();
            },

            render: function() {
                this.updateMap();

                var html = this.pluginTmpl({
                    layers: this.getActiveLayers(),
                    reportData: this.getReportData(),
                    isDrawing: !!this.isDrawing,
                    isLoading: !!this.isLoading
                });

                $(this.container).html(html);

                if ($.i18n) {
                    $(this.container).localize();
                }
                return this.container;
            },

            updateMap: function() {
                this.featureGroup.clear();
                var areaOfInterestFeature = this.getAreaOfInterestFeature();
                if (areaOfInterestFeature) {
                    this.featureGroup.add(areaOfInterestFeature);
                }
            },

            getTemplateById: function(id) {
                return $.trim($('<div>').append(templates)
                    .find('#' + id).html());
            }
        });
    }
);
