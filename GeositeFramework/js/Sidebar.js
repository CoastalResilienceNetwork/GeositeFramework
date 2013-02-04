/*jslint nomen:true, devel:true */
/*global Backbone, _, $, Geosite*/

// A sidebar (part of a pane) contains a collection of tools and a collection of links

(function (N) {
    'use strict';
    N.models = N.models || {};
    N.models.Sidebar = Backbone.Model.extend();

    N.views = N.views || {};
    N.views.Sidebar = Backbone.View.extend({
        render: function renderSidebar() {
            // Render tool blocks
            var pluginFolderNames = this.model.get('pluginFolderNames'),
                toolTemplate = N.app.templates['template-sidebar-tool'],
                $tools = this.$('.tools');
            _.each(pluginFolderNames, function (pluginFolderName) {
                var html = toolTemplate({ pluginFolderName: pluginFolderName });
                $tools.append(html);
            });

            // Render sidebar links
            var links = this.model.get('links'),
                linkTemplate = N.app.templates['template-sidebar-link'],
                $links = this.$('.sidebar-links');
            _.each(links, function (link) {
                var html = linkTemplate({ link: link });
                $links.append(html);
            });

            return this;
        }
    });

}(Geosite));
