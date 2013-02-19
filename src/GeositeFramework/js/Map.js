/*jslint nomen:true, devel:true */
/*global Backbone, _, $, Geosite*/

(function (N) {
    'use strict';
    N.models = N.models || {};
    N.models.Map = Backbone.Model.extend({
        defaults: {
            basemaps: null,
            selectedBasemapIndex: null
        },
    });
}(Geosite));

(function (N) {
    'use strict';
    function initialize(view) {
        view.model.on('change:selectedBasemapIndex', function () {
            selectBasemap(view);
        });
        createMap(view);
    }

    function createMap(view) {
        var domId = "map" + view.options.paneNumber;
        view.$el.attr("id", domId);
        var esriMap = new esri.Map(domId);

        var x = view.model.get('initialExtent');
        esriMap.setExtent(new esri.geometry.Extent(x[0], x[1], x[2], x[3], new esri.SpatialReference({ wkid: 4326 /*lat-long*/ })));

        view.esriMap = esriMap;
        view.model.set('selectedBasemapIndex', 0);

        function resizeMap() {
            esriMap.resize();
            esriMap.reposition();
        }
        resizeMap();
        $(window).on('resize', _.debounce(resizeMap, 300));
    }

    function selectBasemap(view) {
        var index = view.model.get('selectedBasemapIndex'),
            basemaps = view.model.get('basemaps'),
            baseMapLayer = new esri.layers.ArcGISTiledMapServiceLayer(basemaps[index].url);
        view.esriMap.addLayer(baseMapLayer);
    }

    N.views = N.views || {};
    N.views.Map = Backbone.View.extend({
        initialize: function () { initialize(this); }
    });

}(Geosite));
