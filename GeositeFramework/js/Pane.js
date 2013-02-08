/*jslint nomen:true, devel:true */
/*global Backbone, _, $, Geosite*/

// A pane represents the app work area and contains a sidebar and a map

(function (N) {
    'use strict';
    (function () {
        var model = null;

        function initializePane(paneModel) {
            model = paneModel;
            initPlugins();
        }

        function initPlugins() {
            model.set('plugins', []);

            _.each(N.plugins, function (pluginClass) {
                var pluginInstance = new pluginClass();
                pluginInstance.constructor({});
                model.get('plugins').push(pluginInstance);
            });
        }

        N.models = N.models || {};
        N.models.Pane = Backbone.Model.extend({
            initialize: function () {
                initializePane(this);
            }
        });

    }());

    (function () {
        var view = null;
        var model = null;

        function renderPane(paneView) {
            view = paneView;
            model = view.model;
            renderSelf();
            renderPlugins();
            renderSidebarLinks();
            renderMap();
            return view;
        }

        function renderSelf() {
            var paneTemplate = N.app.templates['template-pane'],
                html = paneTemplate();
            view.$el.append(html);
        }

        function renderPlugins() {
            var regionData = model.get('regionData'),
                plugins = model.get('plugins'),
                toolTemplate = N.app.templates['template-sidebar-plugin'],
                $plugins = view.$('.plugins');
            _.each(plugins, function (plugin) {
                var html = toolTemplate({ toolbarName: plugin.toolbarName });
                $plugins.append(html);
            });
        }

        function renderSidebarLinks() {
            var regionData = model.get('regionData'),
                linkTemplate = N.app.templates['template-sidebar-link'],
                $links = view.$('.sidebar-links');
            _.each(regionData.sidebarLinks, function (link) {
                var html = linkTemplate({ link: link });
                $links.append(html);
            });
        }

        function renderMap() {
        }

        N.views = N.views || {};
        N.views.Pane = Backbone.View.extend({
            render: function () {
                renderPane(this);
            }
        });

    }())

}(Geosite));
