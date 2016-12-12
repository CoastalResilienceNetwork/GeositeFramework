define([
    'dojo/_base/declare',
    'esri/geometry/Extent',
    'esri/SpatialReference'
    ],
    function (declare,
              Extent,
              SpatialReference) {
    'use strict';

    var LatLng = new SpatialReference({ wkid: 4326 });

    return declare(null, {
        constructor: function(map, extent) {
            this.map = map;
            this.initialExtent = new Extent(
                extent[0],
                extent[1],
                extent[2],
                extent[3],
                LatLng);
        },

        execute: function() {
            this.map.setExtent(this.initialExtent);
        }
    });
});
