define([
    'use!Geosite',
    'dojo/_base/declare',
    // Disable measure tool as it includes some features
    // not yet implemented in Esri JS API 4.2, specifically:
    // - units
    // - mathUtils
    // - InfoWindow
    // './measure/main',
    './full_extent/main',
    './export/main',
    './share/main'
    ],
    function(N,
             declare,
             // MeasureCommand,
             FullExtentCommand,
             ExportCommand,
             ShareCommand) {
    'use strict';

    return Backbone.View.extend({
        events: {
            'click [data-command]': 'onCommand'
        },

        initialize: function(options) {
            this.map = options.map;
            this.app = options.app;
            this.regionData = options.regionData;
        },

        initializeCommand: function(command) {
            var map = this.map;
            var dispatcher = this.app.dispatcher;
            var initialExtent = this.regionData.initialExtent;

            switch (command) {
                case 'measure':
                    // Disabled for upgrade to Esri JS API v4.2
                    return // new MeasureCommand(map);
                case 'zoom':
                   return new FullExtentCommand(map, initialExtent);
                case 'export':
                   return new ExportCommand(dispatcher);
                case 'share':
                   return new ShareCommand(dispatcher);
            }

            throw new Error('Command not supported');
        },

        cancelCommand: function() {
            if (this.command && this.command.cancel) {
                this.command.cancel();
            }
            this.command = null;
        },

        onCommand: function(e) {
            var $el = $(e.currentTarget),
                command = $el.data('command');

            this.cancelCommand();
            this.command = this.initializeCommand(command);
            this.command.execute();
        }
    });
});
