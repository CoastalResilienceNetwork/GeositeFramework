define([
    'use!Geosite',
    'dojo/_base/declare',
    '../js/widgets/map_utils/measure/main.js',
    '../js/widgets/map_utils/full_extent/main.js',
    '../js/widgets/map_utils/export/main.js',
    '../js/widgets/map_utils/share/main.js'
    ],
    function(N,
             declare,
             MeasureCommand,
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
                    return new MeasureCommand(map);
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
