define(
    ["dojo/_base/declare", "framework/PluginBase"],
    function (declare, PluginBase) {
        return declare(PluginBase, {
            toolbarName: "Map Expand",
            fullName: "Expand the map",
            toolbarType: "map",
            allowIdentifyWhenActive: true,
            closeOthersWhenActive: false,

            initialize: function (args) {
                declare.safeMixin(this, args);
                this.$sidebar = $('.nav-apps.plugins');
                this.sidebarNarrowClassName = 'nav-apps-narrow';

                this.app.dispatcher.on('map-size:change', this.updateIcon, this);
            },

            renderLauncher: function () {
                var html = '<div id="map-expand"><i class="icon-resize-full"></i></div>';

                return html;
            },

            activate: function () {
                if (this.isSidebarNarrow()) {
                    this.$sidebar.removeClass(this.sidebarNarrowClassName);
                } else {
                    this.$sidebar.addClass(this.sidebarNarrowClassName);
                }

                this.updateIcon();
            },

            getClassName: function() {
                if (this.isSidebarNarrow()) {
                    return 'icon-resize-small';
                }

                return 'icon-resize-full';
            },

            isSidebarNarrow: function() {
                if (this.$sidebar.hasClass(this.sidebarNarrowClassName)) {
                    return true;
                }

                return false;
            },

            updateIcon: function() {
                var $container = $('#map-expand');

                $container.find('i').attr('class', this.getClassName());
            }
        });
    }
);
