/*jslint nomen:true, devel:true */
/*global Backbone, _, $, Geosite*/

(function (N) {
    'use strict';

    function getSelectedBasemapLayer(model, esriMap) {
        var basemap = getSelectedBasemap(model);
        if (basemap.layer === undefined) {
            // basemap has no layer yet, so make one and cache it
            basemap.layer = new esri.layers.ArcGISTiledMapServiceLayer(basemap.url);
            esriMap.addLayer(basemap.layer);
        }
        return basemap.layer;
    }

    function getSelectedBasemap(model) {
        var basemaps = model.get('basemaps'),
        selectedBasemapIndex = model.get('selectedBasemapIndex'),
        valid = basemaps !== null &&
                selectedBasemapIndex !== null &&
                selectedBasemapIndex < basemaps.length;
        if (valid) {
            return basemaps[selectedBasemapIndex];
        } else {
            // TODO: log error to console
            return { name: "", url: "" };
        }
    }

    N.models = N.models || {};
    N.models.Map = Backbone.Model.extend({
        defaults: {
            basemaps: null,
            selectedBasemapIndex: null   // Both the map view and the basemap selector listen for changes to this attribute
        },
        initialize: function () {
            // deep-copy 'basemaps' because we're going to modify its elements by adding 'layer' properties
            this.set('basemaps', $.extend(true, [], this.get('basemaps')));
        },
        getSelectedBasemapName: function () { return getSelectedBasemap(this).name; },
        getSelectedBasemapLayer:  function (esriMap) { return getSelectedBasemapLayer(this, esriMap); }
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
        N.map = esriMap;

        var x = view.model.get('initialExtent');
        esriMap.setExtent(new esri.geometry.Extent(x[0], x[1], x[2], x[3], new esri.SpatialReference({ wkid: 4326 /*lat-long*/ })));

        view.esriMap = esriMap;
        view.model.set('selectedBasemapIndex', 0); // triggers call to selectBasemap()

        function resizeMap() {
            esriMap.resize();
            esriMap.reposition();
        }
        resizeMap();
        $(window).on('resize', _.debounce(resizeMap, 300));
    }

    function selectBasemap(view) {
        if (view.currentBasemapLayer !== undefined) {
            view.currentBasemapLayer.hide();
        }
        view.currentBasemapLayer = view.model.getSelectedBasemapLayer(view.esriMap);
        view.currentBasemapLayer.show();
        view.esriMap.reorderLayer(view.currentBasemapLayer, 0);
    }

    N.views = N.views || {};
    N.views.Map = Backbone.View.extend({
        initialize: function () { initialize(this); }
    });

}(Geosite));
