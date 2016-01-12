require({
    packages: [
        {
            name: "jquery",
            location: "//ajax.googleapis.com/ajax/libs/jquery/1.9.0",
            main: "jquery.min"
        },
        {
            name: "underscore",
            location: "//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3",
            main: "underscore-min"
        }
    ]
});

define([
        "dojo/_base/declare",
        "framework/PluginBase",
        "dojo/text!./layers.json",
        "dojo/text!./templates.html",
        "jquery",
        "underscore"
    ],
    function (declare, PluginBase, layerSourcesJson, templates, $, _) {

        return declare(PluginBase, {
            toolbarName: "Map Layers v2",
            fullName: "Configure and control layers to be overlayed on the base map.",
            toolbarType: "sidebar",
            allowIdentifyWhenActive: true,
            hasCustomPrint: true,

            initialize: function (frameworkParameters, currentRegion) {
                declare.safeMixin(this, frameworkParameters);
                var nodes = { nodes: JSON.parse(layerSourcesJson) };
                var test = _.template(this.getTemplateByName('main'))(nodes);
                $(this.container).html(test);

            },

            getTemplateByName: function(name) {
                return $('<div>').append(templates)
                    .find('#' + name)
                    .html().trim();
            },

            getState: function () {},

            setState: function (state) {},

            beforePrint: function(printDeferred) {
                // We can short circuit the plugin print chain by simply
                // rejecting this deferred object.  
                printDeferred.reject();

                // Trigger an export dialog for this pane.
                this.app.dispatcher.trigger('export-map:pane-' + this.app.paneNumber);
            }

        });
    }
);