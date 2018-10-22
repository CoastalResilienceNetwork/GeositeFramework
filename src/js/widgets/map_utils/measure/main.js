define([
    'dojo/_base/declare',
    '../js/widgets/map_utils/measure/AgsMeasure.js'
    ],
    function(declare,
             AgsMeasure) {
    'use strict';

    var introTemplate = $('#template-measure-intro').html();
    var tooltipTemplate = $('#template-measure-tooltip').html();
    var infoBubbleTemplate = $('#template-measure-infobubble').html();

    return declare(null, {
        constructor: function(map) {
            this.agsMeasure = new AgsMeasure({
                map: map,
                introTemplate: introTemplate,
                tooltipTemplate: tooltipTemplate,
                infoBubbleTemplate: infoBubbleTemplate
            });
            this.agsMeasure.initialize();
        },

        execute: function() {
            this.agsMeasure.activate();
        },

        cancel: function() {
            this.agsMeasure.deactivate();
        }
    });
});
