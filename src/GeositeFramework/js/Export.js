// on view submit button click, set exportMap to be the current map

(function (N) {
    "use strict";
    dojo.require("esri.tasks.PrintTask");

    ////////////////////////////////
    // MODEL CLASS
    ////////////////////////////////

    N.models.ExportTool = Backbone.Model.extend({

        defaults: {
            // set by view, listened internally
            exportTitle: "",
            exportOrientation: null,
            exportPaperSize: null,
            exportIncludeLegend: false,

            // set internally, listened by view
            submitEnabled: true,
            outputText: ""
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
                this.set('outputText', "Please enter all required fields.");
            }
        },

        submissionIsValid: function () {
            return (
                _.contains(["Portrait", "Landscape"], this.get('exportOrientation')) &&
                _.contains(["A3","A4","Letter ANSI A","Tabloid ANSI B"], this.get('exportPaperSize')));
        },
        
        setupDependencies: function () {
            /*
              Creates an interface for the rest of the model to interact
              with the esri javascript api.
            */
            var url = N.app.data.region.printServerUrl,
                printTask = new esri.tasks.PrintTask(url),
                params = new esri.tasks.PrintParameters();

            params.map = this.get('esriMap');
            params.template = new esri.tasks.PrintTemplate();
            params.template.format = "PDF";
            params.template.preserveScale = false;
            params.template.showAttribution = false;

            this.pdfManager = {};
            this.pdfManager.params = params;
            this.pdfManager.printTask = printTask;
            this.pdfManager.run = function (layout, title, includeLegend, success, failure) {
                // Populate the dynamic parameters and create the pdf
                this.params.template.layout = layout;
                this.params.template.layoutOptions = {};
                this.params.template.layoutOptions.titleText = title;
                if (!includeLegend) { this.params.template.layoutOptions.legendLayers = []; }
                this.printTask.execute(this.params, success, failure);
            };
        },

        createPDF: function () {
            var model = this,
                resultTemplate = N.app.templates['template-export-url'],
                templateLayout = this.get('exportPaperSize') + " " + this.get('exportOrientation');

            model.pdfManager.run(
                templateLayout,
                model.get('exportTitle'),
                model.get('exportIncludeLegend'),
                function (result) {
                    model.set({
                        outputText: resultTemplate({ url: result.url }),
                        submitEnabled: true
                    });
                },
                function () {
                    model.set('outputText', "There was an error processing your request.");
                });
        }
    });

    ////////////////////////////////
    // VIEW CLASS
    ////////////////////////////////

    N.views.ExportTool = Backbone.View.extend({

        className: 'export-ui',

        events: {
            "click button": function () { this.handleSubmit(); },
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
                    // TODO: this is a little too magical and implicitly derived. Be more clear.
                    exportIncludeLegend: this.$("input:checkbox[name=export-include-legend]:checked").val() === "on" ? true : false,
                    exportPaperSize: this.$("select#export-paper-size").val()
                });
                this.model.submitExport();
            }
        },

        enableSubmit: function () {
            this.$("button#export-button").removeAttr('disabled');
            this.$("div.export-indicator").hide();
        },

        waitForPrintRequest: function () {
            this.$("button#export-button").attr('disabled', 'disabled');
            this.$("div.export-indicator").show();
            this.$("div.export-output-area").empty();
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
                view.$("div.export-output-area").html(this.model.get('outputText'));
                view.enableSubmit();
            });
        },

        render: function () {
            var body = N.app.templates['template-export-window']();
            this.$el
                .empty()
                .append(body);
            return this;
        }
    });

}(Geosite));
