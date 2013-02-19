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
        var $container = view.$('.basemap-selector-list ul');
        var template = N.app.templates['template-basemap-selector-item'];
        _.each(view.model.get('basemaps'), function (basemap, index) {
            var data = _.extend({ index: index }, basemap);
            $container.append(template(data));
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
