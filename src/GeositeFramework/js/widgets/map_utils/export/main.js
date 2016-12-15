define([
    'dojo/_base/declare'
    ],
    function(declare) {
    'use strict';

    return declare(null, {
        constructor: function(dispatcher) {
            this.dispatcher = dispatcher;
        },

        execute: function() {
            this.dispatcher.trigger('export-map:pane-0');
        }
    });
});
