/*jslint nomen:true, devel:true */
/*global Backbone, _, $, Geosite*/

// A map (part of a pane) contains the map work area

(function (N) {
    'use strict';
    N.models = N.models || {};
    N.models.Map = Backbone.Model.extend();

    N.views = N.views || {};
    N.views.Map = Backbone.View.extend({
        render: function renderMap() {
            return this;
        }
    });

}(Geosite));
