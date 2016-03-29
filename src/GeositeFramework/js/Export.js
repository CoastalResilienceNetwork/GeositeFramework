// on view submit button click, set exportMap to be the current map

require(['use!Geosite',
         'esri/tasks/PrintTask',
         'esri/tasks/PrintParameters',
         'esri/tasks/PrintTemplate',
         'esri/tasks/LegendLayer',
         'dojo/Deferred',
         'dojo/request',
         'framework/Logger'],
    function(N,
             PrintTask,
             PrintParameters,
             PrintTemplate,
             LegendLayer,
             Deferred,
             request,
             Logger) {
    "use strict";

    ////////////////////////////////
    // MODEL CLASS
    ////////////////////////////////

    N.models.ExportTool = Backbone.Model.extend({

        defaults: {
            // set by view, listened internally
            exportTitle: "",
            exportOrientation: null,
            // Default ArcGIS print template is Letter ANSI A {Portrait|Landscape}
            // but the framework provides custom templates that can be installed on
            // the AGS to achieve better export results.  Check the region.json to
            // enable the custom template.
            printLayoutTemplatePrefix: 'Letter ANSI A',
            // By default, the ESRI print task reserves space in the
            // template for the legend, which doesn't resize.  To reclaim
            // the space we use a different template for Legend/No Legend
            // but this won't work if you are not using a custom layout
            useDifferentTemplateWithLegend: false,
            exportIncludeLegend: false,
            // set internally, listened by view
            submitEnabled: true,
            outputText: "",
            // Pane number of map to export
            paneNumber: 0
        },

        initialize: function () {
            var model = this;
            model.setupDependencies();
        },

        submitExport: function() {
            if (this.submissionIsValid()) {
                this.set('submitEnabled', false);
                this.createPDF();
            } else {
                this.set('outputText', i18next.t("Please enter all required fields."));
            }
        },

        submissionIsValid: function () {
            return _.contains(["Portrait", "Landscape"], this.get('exportOrientation'));
        },

        setupDependencies: function () {
            /*
              Creates an interface for the rest of the model to interact
              with the esri javascript api, only if an export setting has
              been specified in the region.json
            */
            var model = this,
                url = N.app.data.region.print.printServerUrl;

            // If there is a custom template scheme for export, override the
            // default settings.  If no custom template is provided, the export
            // will work with the out-of-the-box ArcGIS Print Task settings
            if (N.app.data.region.print.customPrintTemplatePrefix) {
                this.set('printLayoutTemplatePrefix',
                    N.app.data.region.print.customPrintTemplatePrefix);
                this.set('useDifferentTemplateWithLegend', true);
            }

            model.set('submitEnabled', false);
            model.fetchServiceConfig(url).then(function(config) {
                var printTask = new PrintTask(url, {async: config.async});
                var taskParams = model.getExportParams();
                model.pdfManager = model.createPdfManager(taskParams, printTask);
                model.set('submitEnabled', true);
            });
        },

        // Fetch task settings from REST API
        fetchServiceConfig: function(url) {
            var defer = new Deferred(),
                jsonUrl = 'proxy.ashx?' + url + '?f=json',
                config = {
                    async: false
                },
                onSuccess = function(data) {
                    if (data) {
                        config.async = data.executionType == 'esriExecutionTypeAsynchronous';
                    }
                },
                onFailure = function() {
                    new Logger('export').warn(null, i18next.t('Failed to load service config'));
                },
                onFinish = function() {
                    defer.resolve(config);
                };
            request(jsonUrl, {handleAs: 'json'})
                .then(onSuccess, onFailure)
                .then(onFinish);
            return defer.promise;
        },

        getExportParams: function() {
            var params = new PrintParameters();
            params.map = this.get('esriMap');
            params.template = new PrintTemplate();
            params.template.format = "PDF";
            params.template.preserveScale = false;
            params.template.showAttribution = false;
            return params;
        },

        createPdfManager: function(taskParams, printTask) {
            var model = this,
                pdfManager = {};
            pdfManager.params = this.getExportParams();
            pdfManager.printTask = printTask;
            pdfManager.run = function (layout, title, includeLegend, success, failure) {
                // Populate the dynamic parameters and create the pdf
                this.params.template.layout = layout;
                this.params.template.layoutOptions = {};
                this.params.template.layoutOptions.titleText = title;
                this.params.template.layoutOptions.legendLayers = includeLegend ?
                    model.getLegendLayers(taskParams.map) : [];
                this.printTask.execute(this.params, success, failure);
            };
            return pdfManager;
        },

        // Return list of all visible layers on map.
        // Issue #269.
        // We no longer add group nodes to the list of visible map ids.
        // However, it seems like the PrintTask cannot render the map legend
        // without all parent layer ids present.
        getLegendLayers: function(map) {
            var model = this,
                result = [];
            _.each(map.getLayersVisibleAtScale(), function(layer) {
                if (layer.visibleLayers && layer.visibleLayers.length > 0 && layer.visibleLayers[0] !== -1) {
                    var legendLayer = new LegendLayer();
                    legendLayer.layerId = layer.id;
                    legendLayer.subLayerIds = model.getLayerParents(layer, layer.visibleLayers);
                    result.push(legendLayer);
                }
            });
            return result;
        },

        // Return union of layerIds and related parent layer ids.
        getLayerParents: function(layer, layerIds) {
            var result = _.clone(layerIds),
                // Build lookup table.
                layerId_to_parentLayerId = _.object(_.zip(
                    _.pluck(layer.layerInfos, 'id'),
                    _.pluck(layer.layerInfos, 'parentLayerId')
                )),
                layerId = null,
                i = 0;
            // Loop through each visible layer and append its direct parent.
            // This is an iterative node traversal process that will queue the
            // next node to process at each iteration. Once we reach the root layer
            // node there is no parent node to queue and the loop terminates.
            while ((layerId = result[i++]) != null) {
                var parentLayerId = layerId_to_parentLayerId[layerId];
                if (parentLayerId != null && parentLayerId > -1 && !_.contains(result, parentLayerId)) {
                    result.push(parentLayerId);
                }
            }
            return result;
        },

        createPDF: function () {
            var model = this,
                resultTemplate = N.app.templates['template-export-url'],
                attempts = 3,
                onSuccess = function(result) {
                    model.set('outputText', resultTemplate({ url: result.url }));
                    onFinish();
                },
                onFailure = _.debounce(function() {
                    var result = [];
                    result.push(i18next.t('There was an error processing your request.'));
                    if (attempts > 0) {
                        var s = attempts == 1 ? '' : 's';
                        result.push('Trying again ' + attempts + ' more time' + s + '...');
                    }
                    model.set('outputText', result.join('<br />'));
                    tryCreatePdf();
                }, 1000),
                onFinish = function() {
                    model.set('submitEnabled', true);
                },
                tryCreatePdf = function() {
                    if (attempts <= 0) {
                        onFinish();
                        return;
                    }
                    model.pdfManager.run(
                        model.getPrintTemplateName(),
                        model.get('exportTitle'),
                        model.get('exportIncludeLegend'),
                        onSuccess,
                        onFailure
                    );
                    attempts--;
                };
            tryCreatePdf();
        },

        getPrintTemplateName: function() {
            // Print templates are MXDs on an AGS Server with the following
            // naming convention: <<TemplatePrefix>> <<Orientation>> <<""|Legend>>.mxd
            // This is an ESRI convention and includes whitespace, but the template
            // name should not include the file extension.
            var model = this,
                includeLegend = model.get('exportIncludeLegend') && model.get('useDifferentTemplateWithLegend'),
                legendSuffix = includeLegend ? 'Legend' : '',
                prefix = model.get('printLayoutTemplatePrefix'),
                orientation = model.get('exportOrientation');

            return $.trim(prefix + " " + orientation + " " + legendSuffix);
        }
    });

    ////////////////////////////////
    // VIEW CLASS
    ////////////////////////////////

    N.views.ExportTool = Backbone.View.extend({

        className: 'export-ui',

        events: {
            "click #export-button": function () { this.handleSubmit(); },
            "keyup input": function (event) { this.handleKeyPress(event); }
        },

        handleKeyPress: function (event) {
            var keycode = (event.keyCode ? event.keyCode : null);
            if (keycode === 13) { this.handleSubmit(); }
        },

        handleSubmit: function () {
            if (this.model.get('submitEnabled') === true) {
                this.model.set({
                    exportTitle: this.$("#export-title").val(),
                    exportOrientation: this.$("input:radio[name=export-orientation]:checked").val(),
                    exportIncludeLegend: this.$('input[name=export-include-legend]').is(':checked')
                });
                this.model.submitExport();
            }
        },

        enableSubmit: function () {
            this.$("#export-button").removeAttr('disabled');
            this.$("div.export-indicator").hide();
        },

        waitForPrintRequest: function () {
            this.$("#export-button").attr('disabled', 'disabled');
            this.$("div.export-indicator").show();
            this.$(".export-output-area").empty();
        },

        initialize: function () {
            var view = this;

            // show/hide indicator when search is in progress
            view.listenTo(view.model, "change:submitEnabled", function () {
                if (view.model.get("submitEnabled") === true) {
                    view.enableSubmit();
                } else {
                    view.waitForPrintRequest();
                }
            });
            view.listenTo(view.model, "change:outputText", function () {
                view.$(".export-output-area").html(view.model.get('outputText'));
            });
        },

        render: function () {
            var body = N.app.templates['template-export-window']();
            this.$el
                .empty()
                .append(body);
            var paneNumber = (+this.model.get('paneNumber')) + 1;
            this.$('.export-pane-number').text(paneNumber);

            if ($.i18n) {
                $(this.$el).localize();
            }

            return this;
        }
    });
});
