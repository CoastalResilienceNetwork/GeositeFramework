/*jslint nomen:true, devel:true */
/*global alert */

define(['dojo/_base/declare', 'use!Azavea'], function(declare, Azavea) {
    "use strict";

    var Logger = declare(null, {
        constructor: function(pluginName) {
            this.pluginName = pluginName;
        },
        log: function(userMessage, developerMessage, level) {
            if (developerMessage) {
                // Log to server-side plugin-specific log file
                Azavea.logMessage(developerMessage, this.pluginName, level);
                if (level === "ERROR") {
                    // Errors also get logged to server-side main log file
                    Azavea.logError("Error in plugin '" + this.pluginName + "': " + developerMessage);
                }
            }
            if (userMessage) {
                // TODO: create a panel
                alert(userMessage);
            }
        },
        info: function(userMessage, developerMessage) {
            this.log(userMessage, developerMessage, "INFO");
        },
        warn: function(userMessage, developerMessage) {
            this.log(userMessage, developerMessage, "WARN");
        },
        error: function(userMessage, developerMessage) {
            this.log(userMessage, developerMessage, "ERROR");
        }
    });
    
    return Logger;
});
