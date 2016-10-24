define([
    'dojo/_base/declare'
    ],
    function(declare) {
    'use strict';

    return declare(null, {
        constructor: function(args) {
            declare.safeMixin(this, args);
        },

        execute: function() {
            this.app.dispatcher.trigger('export-map:pane-0');
        },

        cancel: function() {
            // NOOP
        }
    });
});
