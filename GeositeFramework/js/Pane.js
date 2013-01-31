/*jslint nomen:true, devel:true */
/*global Backbone, _, $, Geosite*/

// A pane represents the app work area and contains a sidebar and a map

(function (N) {
    'use strict';
    N.models = N.models || {};
    N.models.Pane = Backbone.Model.extend({
        initialize: function initializePane() {
            var regionData = this.get('regionData');
            // Initialize nested models
            var sidebar = new N.models.Sidebar({
                links: regionData.sidebarLinks,
                pluginFolderNames: regionData.pluginOrder
            });
            this.set('sidebar', sidebar);
            var map = new N.models.Map({
                name: regionData.basemaps[0].name,
                url: regionData.basemaps[0].url
            });
            this.set('map', map);
        }
    });

    N.views = N.views || {};
    N.views.Pane = Backbone.View.extend({
        initialize: function initializePaneView() {
            this.sidebar = new N.views.Sidebar({
                model: this.model.get('sidebar'),
                el: this.$('.sidebar')
            });
            this.map = new N.views.Map({
                model: this.model.get('map'),
                el: this.$('.map')
            });
        },

        render: function renderPane() {
            this.sidebar.render();
            this.map.render();
            return this;
        }
    });

}(Geosite));
