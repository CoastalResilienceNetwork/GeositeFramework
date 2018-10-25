//= require jquery
//= require underscore
//= require backbone

/*jslint nomen: true, browser: true, devel:true*/
/*global Backbone, _, Geosite*/

(function (N) {
    "use strict";

    if (N.Geosite) {
        return;
    }

    N.Geosite = _.clone(Backbone.Events);

    // Class objects (see App.js for instances)
    N.Geosite.models = {};
    N.Geosite.collections = {};
    N.Geosite.views = {};
    N.Geosite.controllers = {};
    N.Geosite.plugins = [];

    N.Geosite.on('error', function handleError(model, error) {
        console.log("Geosite error: " + error);
    });
}(this));
