// "Feature Comparison" plugin, main module

require({
    // Specify library locations.
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

define(
    ["dojo/_base/declare", "framework/PluginBase", "dojo/text!./templates.html",
        "dojo/text!./compare_config.json", './FeatureComparer'],
    function (declare, PluginBase, templates, config, FeatureComparer) {

        var _config = $.parseJSON(config);

        return declare(PluginBase, {
            toolbarName: _config.pluginName || "Feature Comparer",
            fullName: _config.pluginDesc || "Compare attributues of up to three features",
            toolbarType: "sidebar",
            allowIdentifyWhenActive: false,
            showServiceLayersInLegend: false,
            width: 500,

            initialize: function (args) {

                this.comparer = new FeatureComparer({
                    context: args, 
                    templates: templates,
                    config: _config
                });
            },

            activate: function() {
                this.comparer.activate();
            },
            
            deactivate: function() {
                this.comparer.hide();
            },
            
            hibernate: function() {
                this.comparer.close();
            },
            
            setState: function(state) {
                this.comparer.setInitialState(state);
            },
            
            getState: function () {
                return this.comparer.getState();
            }
        });
    }
);
