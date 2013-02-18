/*jslint nomen:true, devel:true */
/*global Backbone, _, $, Geosite*/

(function (N) {
    'use strict';
    N.models = N.models || {};
    N.models.BasemapSelector = Backbone.Model.extend({
        defaults: {
            basemaps: null,
            selectedBasemapName: null
        }
    });
}(Geosite));

(function (N) {
    'use strict';
    function render(view) {
        _.each(view.model.get('basemaps'), function (basemap) {
            var $item = $('<li>').append(basemap.name);
            view.$('.basemap-selector-list ul').add($item);
        });
        return view;
    }

    N.views = N.views || {};
    N.views.BasemapSelector = Backbone.View.extend({
        initialize: function () {
            return render(this);
        }
    });

}(Geosite));
