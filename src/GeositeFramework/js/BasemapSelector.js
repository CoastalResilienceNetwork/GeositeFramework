/*jslint nomen:true, devel:true */
/*global Backbone, _, $, Geosite*/

// This view's model is a Map object

(function (N) {
    'use strict';
    function initialize(view) {
        view.model.on('change:selectedBasemapIndex', function () {
            var name = view.model.getSelectedBasemapName();
            view.$('.basemap-selector-title').text(name);
        });
        render(view);
    }

    function render(view) {
        var $container = view.$('.basemap-selector-list ul');
        var template = N.app.templates['template-basemap-selector-item'];
        _.each(view.model.get('basemaps'), function (basemap, index) {
            var data = _.extend({ index: index }, basemap);
            $container.append(template(data));
        });
        return view;
    }

    function onItemClicked(view, e) {
        var index = $(e.currentTarget).data("index");
        view.model.set('selectedBasemapIndex', index);
    }

    N.views = N.views || {};
    N.views.BasemapSelector = Backbone.View.extend({
        initialize: function () { return initialize(this); },
        events: {
            'click li': function (e) { onItemClicked(this, e); }
        }

    });

}(Geosite));
