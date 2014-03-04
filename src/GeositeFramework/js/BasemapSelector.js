/*jslint nomen:true, devel:true */
/*global Backbone, _, $, Geosite*/

// This view's model is a Map object

(function (N) {
    'use strict';
    function initialize(view) {
        render(view);
        // When the map's selected basemap changes, update the title element in the DOM
        view.model.on('change:selectedBasemapIndex', function () { renderSelectedBasemapName(view); });
    }

    function render(view) {
        var $container = view.$('.basemap-selector-list ul'),
            template = N.app.templates['template-basemap-selector-item'];
        _.each(view.model.get('basemaps'), function (basemap, index) {
            // Augment basemap data with 'index' to feed the DOM item's data-index attribute
            var data = _.extend({ index: index }, basemap);
            $container.append(template(data));
        });
        renderSelectedBasemapName(view);
        return view;
    }

    function renderSelectedBasemapName(view) {
        var name = view.model.getSelectedBasemapName(),
            downArrow = '<span>&#9660;</span>';
        view.$('.basemap-selector-title').html(name + downArrow);
    }

    function onItemClicked(view, e) {
        // DOM element's 'data-index' attribute tells us which item was clicked
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
