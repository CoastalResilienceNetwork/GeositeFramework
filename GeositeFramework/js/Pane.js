/*jslint nomen:true, devel:true */
/*global Backbone, _, $, Geosite*/

// A pane represents the app work area and contains a sidebar and a map

(function (N) {
    'use strict';
    N.models = N.models || {};
    N.models.Pane = Backbone.Model.extend({

        initialize: function initializePane() {
            this.initPlugins();
        },

        initPlugins: function initPlugins() {
            var model = this;
            model.set('plugins', []);
            _.each(N.plugins, function (pluginClass) {
                var pluginInstance = new pluginClass();
                pluginInstance.constructor({});
                model.get('plugins').push(pluginInstance);
            });
        }
    });

    N.views = N.views || {};
    N.views.Pane = Backbone.View.extend({

        render: function renderPane() {
            this.renderSelf();
            this.renderPlugins();
            this.renderSidebarLinks();
            this.renderMap();
            return this;
        },

        renderSelf: function renderSelf() {
            var paneTemplate = N.app.templates['template-pane'],
                html = paneTemplate();
            this.$el.append(html);
        },

        renderPlugins: function renderPlugins() {
            var regionData = this.model.get('regionData'),
                plugins = this.model.get('plugins'),
                pluginTemplate = N.app.templates['template-sidebar-plugin'],
                $plugins = this.$('.plugins');
            _.each(plugins, function (plugin) {
                var html = pluginTemplate({ toolbarName: plugin.toolbarName });
                $plugins.append(html);
            });
        },

        renderSidebarLinks: function renderSidebarLinks() {
            var regionData = this.model.get('regionData'),
                linkTemplate = N.app.templates['template-sidebar-link'],
                $links = this.$('.sidebar-links');
            _.each(regionData.sidebarLinks, function (link) {
                var html = linkTemplate({ link: link });
                $links.append(html);
            });
        },

        renderMap: function renderMap() {
            return this;
        }

    });

}(Geosite));
