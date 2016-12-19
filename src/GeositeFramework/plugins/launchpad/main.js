require({
    packages: [
        {
            name: "jquery",
            location: "//ajax.googleapis.com/ajax/libs/jquery/1.9.0",
            main: "jquery.min"
        }
    ]
});

define([
        'use!Geosite',
        "dojo/_base/declare",
        "dojo/text!./templates.html",
        "dojo/text!./overrides.json",
        "framework/PluginBase"
    ],
    function(N,
             declare,
             templates,
             overridesJson,
             PluginBase) {
        "use strict";

        var overrides = JSON.parse(overridesJson);
        return declare(PluginBase, {
            toolbarName: overrides.name || "Get Started",
            fullName: overrides.description || "Get started using the application",
            size: overrides.size || 'small',
            width: overrides.width || 300,
            hasCustomPrint: false,
            infoGraphic: undefined,
            toolbarType: "sidebar",
            allowIdentifyWhenActive: true,
            uiState: {},

            initialize: function (frameworkParameters, currentRegion) {
                declare.safeMixin(this, frameworkParameters);
                this.pluginTmpl = _.template(this.getTemplateById('plugin'));
                this.bindEvents();
            },

            bindEvents: function() {
                var self = this;

                $(this.container)
                    .on('click', 'button.launch-plugin', function(e) {
                        var pluginName = $(e.target).data('pluginName');
                        self.plugin.turnOff();
                        self.triggerEvent('launchpad:activate-plugin', pluginName);
                    })
                    .on('click', 'button.launch-scenario', function(e) {
                        var saveCode = $(e.target).data('saveCode');
                        self.plugin.turnOff();
                        self.triggerEvent('launchpad:activate-scenario', saveCode);
                    })
                    .on('click', 'button.truncate-toggle', function (e) {
                        var ui_key = $(e.target).data('ui-key');
                        self.uiState[ui_key].textTruncated = !self.uiState[ui_key].textTruncated;
                        self.render();
                    });
            },

            activate: function() {
                var self = this;
                _.each(N.app.data.region.launchpad.plugins,
                    function(p) {
                        self.uiState['plugin-' + p.pluginName] = {
                            showToggle: p.description.length > 140,
                            textTruncated: p.description.length > 140,
                        }
                    },
                    this);
                _.each(N.app.data.region.launchpad.scenarios,
                    function(p) {
                        self.uiState['scenario-' + p.saveCode] = {
                            showToggle: p.description.length > 140,
                            textTruncated: p.description.length > 140,
                        }
                    },
                    this);
                this.render();
            },

            deactivate: function() {
                var self = this;
                self.plugin.turnOff();
            },

            render: function () {
                var $el = $(this.pluginTmpl({
                    title: N.app.data.region.launchpad.title,
                    description: N.app.data.region.launchpad.description,
                    plugins: N.app.data.region.launchpad.plugins,
                    scenarios: N.app.data.region.launchpad.scenarios,
                    partners: N.app.data.region.partners,
                    uiState: this.uiState,
                }));

                $(this.container).empty().append($el);
            },

            getTemplateById: function(id) {
                return $('<div>').append(templates)
                    .find('#' + id)
                    .html().trim();
            },

            triggerEvent: function(eventName, eventData) {
                N.app.dispatcher.trigger(eventName, eventData);
            }
        });
    }
);
