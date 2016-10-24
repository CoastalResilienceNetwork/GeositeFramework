require({
    packages: [
        {
            name: 'jquery',
            location: '//ajax.googleapis.com/ajax/libs/jquery/1.9.0',
            main: 'jquery.min'
        }
    ]
});

define([
    'dojo/_base/declare',
    'esri/geometry/Extent',
    'esri/SpatialReference'
    ],
    function (declare,
              Extent,
              SpatialReference) {
    'use strict';

    return declare(null, {
        constructor: function(args) {
            declare.safeMixin(this, args);
        },

        execute: function() {
            var extent = this.getInitialExtent();
            this.map.setExtent(extent);
        },

        cancel: function() {
            // NOOP
        },

        getInitialExtent: function() {
            var x = this.app.regionConfig.initialExtent,
                srs = new SpatialReference({ wkid: 4326 /*lat-long*/ });
            return new Extent(x[0], x[1], x[2], x[3], srs);
        },

        renderLauncher: function() {
            return $('<div class="full-extent"></div>');
        }
    });
});
