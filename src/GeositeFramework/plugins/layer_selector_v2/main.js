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
        "dojo/text!./templates.html",
        "./config",
        "jquery",
        "underscore"
    ],
    function (declare, PluginBase, templates, Config, $, _) {

        return declare(PluginBase, {
            toolbarName: "Map Layers v2",
            fullName: "Configure and control layers to be overlayed on the base map.",
            toolbarType: "sidebar",
            allowIdentifyWhenActive: true,
            hasCustomPrint: true,

            initialize: function (frameworkParameters, currentRegion) {
                declare.safeMixin(this, frameworkParameters);
                this.config = new Config();
                this.treeTmpl = _.template(this.getTemplateByName('tree'));
                this.layerTmpl = _.template(this.getTemplateByName('layer'));
            },

            render: function() {
                var layers = this.config.getLayers(),
                    html = this.renderTree(layers);
                $(this.container).html(html);
            },

            renderTree: function(layers) {
                return this.treeTmpl({
                    layers: layers,
                    renderLayer: _.bind(this.renderLayer, this)
                });
            },

            renderLayer: function(layer) {
                return this.layerTmpl({
                    layer: layer
                });
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
            },

            activate: function() {
                $(this.legendContainer).show().html('Layer Selector V2');
                this.render();
            },

            deactivate: function() {
                $(this.legendContainer).hide().html();
            }

        });
    }
);