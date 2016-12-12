define([
    'dojo/_base/declare',
    ],
    function(declare) {
    'use strict';

    return declare(null, {
        constructor: function(args) {
            declare.safeMixin(this, args);
        },

        execute: function() {
            this.app.dispatcher.trigger('save-share');
        },

        cancel: function() {
            // NOOP
        }
    });
});
