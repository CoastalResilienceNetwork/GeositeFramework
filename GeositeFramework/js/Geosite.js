﻿//= require jquery
//= require underscore
//= require backbone

/*jslint nomen: true, browser: true, devel:true*/
/*global Backbone, _, Geosite*/

(function (N) {
    "use strict";
    N.Geosite = _.clone(Backbone.Events);

    // Class objects (see App.js for instances)
    N.Geosite.models = {};
    N.Geosite.views = {};
    N.Geosite.plugins = [];

    N.Geosite.on('error', function handleError(model, error) {
        console.log("Geosite error: " + error);
    });
}(this));



