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
    './AgsMeasure',
    'dojo/text!./templates.html'
    ],
    function(declare,
             AgsMeasure,
             templates) {
    'use strict';

    var $templates = $('<div>').append($($.trim(templates)));

    return declare(null, {
        constructor: function(args) {
            declare.safeMixin(this, args);
            this.agsMeasure = new AgsMeasure({
                map: this.map,
                tooltipTemplate: $templates.find('#template-measure-tooltip').html(),
                infoBubbleTemplate: $templates.find('#template-measure-infobubble').html()
            });
            this.agsMeasure.initialize();
        },

        execute: function() {
            return this.agsMeasure.activate();
        },

        cancel: function() {
            this.agsMeasure.deactivate();
        },

        hibernate: function() {
            this.deactivate();
            if (this._pointLayer) this._pointLayer.clear();
            if (this._lineLayer) this._lineLayer.clear();
        }
    });
});
