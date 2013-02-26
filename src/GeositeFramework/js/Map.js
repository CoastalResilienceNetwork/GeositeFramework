/*jslint nomen:true, devel:true */
/*global Backbone, _, $, Geosite*/

(function (N) {
    'use strict';

    function getSelectedBasemapLayer(model, esriMap) {
        // Return an ESRI layer object for the currently-selected basemap spec
        var basemap = getSelectedBasemap(model);
        if (basemap.layer === undefined) {
            // This basemap has no layer yet, so make one and cache it
            basemap.layer = new esri.layers.ArcGISTiledMapServiceLayer(basemap.url);
            esriMap.addLayer(basemap.layer);
        }
        return basemap.layer;
    }

    function getSelectedBasemap(model) {
        // Return the selected basemap spec, after validation
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
            selectedBasemapIndex: null,   // Both the map view and the basemap selector listen for changes to this attribute
            sync: false
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
        // To make an ESRI map object we need a unique DOM id.
        // Construct the id using my pane's number
        var domId = "map" + view.options.paneNumber;
        view.$el.attr("id", domId);
        view.esriMap = new esri.Map(domId);

        var x = view.model.get('initialExtent');
        view.esriMap.setExtent(new esri.geometry.Extent(x[0], x[1], x[2], x[3],
            new esri.SpatialReference({ wkid: 4326 /*lat-long*/ })));

        view.model.set('selectedBasemapIndex', 0); // triggers call to selectBasemap()
    }

    function selectBasemap(view) {
        // Hide the current basemap layer
        if (view.currentBasemapLayer !== undefined) {
            view.currentBasemapLayer.hide();
        }
        // Show the new basemap layer (at index 0)
        view.currentBasemapLayer = view.model.getSelectedBasemapLayer(view.esriMap);
        view.currentBasemapLayer.show();
        view.esriMap.reorderLayer(view.currentBasemapLayer, 0);
    }

    N.views = N.views || {};
    N.views.Map = Backbone.View.extend({
        initialize: function () { initialize(this); }
    });

}(Geosite));
