/*jslint nomen:true, devel:true */
/*global Backbone, _, $, Geosite*/

// This view's model is a Map object

(function (N) {
    'use strict';
    function initialize(view) {
        render(view);
        // When the map's selected basemap changes, update the title element in the DOM
        view.model.on('change:selectedBasemapIndex', function () { renderSelectedBasemapName(view); });
        view.model.set('basemapListVisible', false);
        $(document).on('click', function(e) {
           if (!_.contains(['basemap-selector-list', 'basemap-selector'], e.target.className)) {
               hideBasemapList(view);
           }
        });
        // Listen on the "Tour" link element to ensure the
        // basemap selector closes before the tour overlay's applied
        $('#help-overlay-start').on('click', function() {
            hideBasemapList(view);
        });
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
        e.stopPropagation();
        hideBasemapList(view);
    }

    function toggleBasemapList(view, e) {
        e.stopPropagation();
        if (view.model.get('basemapListVisible')) {
            view.model.set('basemapListVisible', false);
            view.$el.find('.basemap-selector-list').hide();
        } else {
            view.model.set('basemapListVisible', true);
            view.$el.find('.basemap-selector-list').show();
        }
    }

    function hideBasemapList(view) {
        view.model.set('basemapListVisible', false);
        view.$el.find('.basemap-selector-list').hide();
    }

    N.views = N.views || {};
    N.views.BasemapSelector = Backbone.View.extend({
        initialize: function () { return initialize(this); },
        events: {
            'click li': function (e) { onItemClicked(this, e); },
            'click': function (e) { toggleBasemapList(this, e); }
        }
    });
}(Geosite));
