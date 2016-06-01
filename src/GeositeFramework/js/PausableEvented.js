define([
         'dojo/_base/declare',
         'dojo/Evented'
        ],
    function(declare, Evented) {
        "use strict";

        // Base class which provides a way to pause and resume calls to
        // `emit` for a performance boost during batch operations.
        return declare([Evented], {
            constructor: function() {
                this.paused = false;
            },

            // @Override
            emit: function() {
                if (this.paused) {
                    return false;
                }
                return Evented.prototype.emit.apply(this, arguments);
            },

            pauseEvents: function() {
                this.paused = true;
            },

            resumeEvents: function() {
                this.paused = false;
            }
        });
    }
);