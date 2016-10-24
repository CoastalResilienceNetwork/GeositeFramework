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
    'use!Geosite',
    'dojo/_base/declare',
    'framework/PluginBase',
    'dojo/text!./templates.html',
    './measure/main',
    './full_extent/main'
    ],
    function(N,
             declare,
             PluginBase,
             templates,
             MeasureCommand,
             FullExtentCommand) {
    'use strict';

    var $templates = $('<div>').append($($.trim(templates)));

    return declare(PluginBase, {
        toolbarName: 'Map Utilities',
        fullName: 'Map Utilities',
        toolbarType: 'map',

        // Prevent identify from conflicting with "measure" commmand.
        allowIdentifyWhenActive: false,

        initialize: function(args) {
            declare.safeMixin(this, args);
            this.options = args;
        },

        activate: function() {
            this.createMenu();
        },

        deactivate: function() {
            this.cancelCommand();
            this.destroyMenu();
        },

        hibernate: function() {
            this.deactivate();
        },

        getPluginContainer: function() {
            var $parent = $('.content .map .map-utils').parents('.topbar-plugin');
            return $parent;
        },

        createMenu: function() {
            var $container = this.getPluginContainer(),
                html = $templates.find('#template-map-utils-menu').html();

            this.$menu = $('<div>')
                .on('click', '[data-command]', this.onCommand.bind(this))
                .append(html);

            $container.append(this.$menu);

            if ($.i18n) {
                this.$menu.localize();
            }
        },

        destroyMenu: function() {
            if (this.$menu) {
                this.$menu.remove();
                this.$menu = null;
            }
        },

        onCommand: function(e) {
            var $el = $(e.currentTarget),
                command = $el.data('command');

            this.cancelCommand();
            this.command = this.initializeCommand(command);

            // Commands may return "nothing" to indicate that they execute
            // immediately, or a Deferred, to indicate that map_utils should
            // remain active until the action is finished executing.
            var defer = this.command.execute();

            if (defer) {
                defer.then(this.plugin.turnOff);
                this.destroyMenu();
            } else {
                this.plugin.turnOff();
            }
        },

        initializeCommand: function(command) {
            switch (command) {
                case 'measure':
                    return new MeasureCommand(this.options);
                case 'zoom':
                   return new FullExtentCommand(this.options);
            }
            throw new Error('Command not supported');
        },

        cancelCommand: function() {
            if (this.command) {
                this.command.cancel();
                this.command = null;
            }
        },

        renderLauncher: function() {
            return $templates.find('#template-map-utils-launcher').html();
        }
    });
});
