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
        "./js/PluginBase.js"
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
            toolbarType: "sidebar",
            allowIdentifyWhenActive: true,
            hideMinimizeButton: _.isUndefined(overrides.hideMinimizeButton) ? false : overrides.hideMinimizeButton,
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
                    .on('click', 'a.truncate-toggle', function (e) {
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
                            textTruncated: p.description.length > 140
                        };
                    },
                    this);
                _.each(N.app.data.region.launchpad.scenarios,
                    function(p) {
                        self.uiState['scenario-' + p.saveCode] = {
                            showToggle: p.description.length > 140,
                            textTruncated: p.description.length > 140
                        };
                    },
                    this);
                this.render();
            },

            deactivate: function() {
                var self = this;
                self.plugin.turnOff();
            },

            render: function() {
                var config = N.app.data.region.launchpad,
                    snippetSelector = '#custom-launchpad-content';

                var $el = $(this.pluginTmpl({
                    htmlSnippet: config.html ? $(snippetSelector).html() : null,
                    title: config.title,
                    description: config.description,
                    plugins: config.plugins,
                    scenarios: config.scenarios,
                    partners: config.partners,
                    uiState: this.uiState,
                }));

                $(this.container).empty().append($el);

                if (config.infographic) {
                    this.addInfographicButton(config);
                }

                if ($.i18n) {
                    $($el).localize();
                }
            },

            getTemplateById: function(id) {
                return $('<div>').append(templates)
                    .find('#' + id)
                    .html().trim();
            },

            triggerEvent: function(eventName, eventData) {
                N.app.dispatcher.trigger(eventName, eventData);
            },

            addInfographicButton: function(config) {
                var $containerParent = $(this.container).parent(),
                    self = this;

                $containerParent.append(_.template(this.getTemplateById('infographic-button')));
                $containerParent.find('.nav-title').addClass('title-with-graphic');
                $containerParent.find('.infographic-icon').on('click', function() {
                    self.showInfographic(config);
                });
            },

            showInfographic: function(config) {
                TINY.box.show({
                    animate: true,
                    url: 'plugins/launchpad/infographic.html',
                    fixed: true,
                    width: config.infographic.width,
                    height: config.infographic.height
                });
            }
        });
    }
);
