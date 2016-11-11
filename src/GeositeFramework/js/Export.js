require(['use!Geosite',
         'dojo/Deferred',
         'dojo/request',
         'framework/Logger'],
    function(N,
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
            $('.print-sandbox-header h1').text(this.$("#export-title").val());

            // Any plugin-prints may have left specific print css
            // or sandbox elements. Clear all so that this new print routine
            // has no conflicts with other plugins.
            $('#plugin-print-sandbox').empty();
            $('.plugin-print-css').remove();

            // Add the print stylesheet for the app
            // Reuse the print plugin class so that this CSS file
            // will be removed when a plugin print is triggered
            $('<link>', {
                rel: 'stylesheet',
                href: 'css/app-print.css',
                'class': 'plugin-print-css'
            }).appendTo('head');

            // This needs to be delayed to give the browser time to parse the
            // new print stylesheet.
            window.setTimeout(function() {
                window.print();
            }, 200);
        },

        initialize: function () {
            var view = this;

            view.listenTo(view.model, "change:outputText", function () {
                view.$(".export-output-area").html(view.model.get('outputText'));
            });
        },

        render: function () {
            var body = N.app.templates['template-export-window']();
            this.$el
                .empty()
                .append(body);

            if ($.i18n) {
                $(this.$el).localize();
            }

            return this;
        }
    });
});
