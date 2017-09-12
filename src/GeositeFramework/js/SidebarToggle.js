(function (N) {
    'use strict';

    var sidebarNarrowClassName = 'nav-apps-narrow';
    var $sidebar;

    function initialize(view, $sidebarContainer) {
        $sidebar = $sidebarContainer;
    }

    function toggle(view) {
        if (isSidebarNarrow()) {
            $sidebar.removeClass(sidebarNarrowClassName);
        } else {
            $sidebar.addClass(sidebarNarrowClassName);
        }

        updateIcon(view);
    }

    function getIconClassName() {
        if (isSidebarNarrow()) {
            return 'fa fa-chevron-right';
        }

        return 'fa fa-chevron-left';
    }

    function isSidebarNarrow() {
        return $sidebar.hasClass(sidebarNarrowClassName);
    }

    function updateIcon(view) {
        view.$el.find('i').attr('class', getIconClassName());
    }


    N.views = N.views || {};
    N.views.SidebarToggle = Backbone.View.extend({
        initialize: function () { return initialize(this, $('.nav-apps.plugins')); },
        events: {
            'click': function (e) { toggle(this, e); }
        }
    });

    // Single plugin mode button to toggle plugin visibility
    N.views.TogglePlugin = Backbone.View.extend({
        initialize: function(options) {
            this.singlePlugin = options.viewModel.get('plugins').at(0);
        },

        events: {
            'click': 'togglePluginVisibility'
        },

        togglePluginVisibility: function() {
            if (this.singlePlugin.selected) {
                this.singlePlugin.deselect();
                this.$el.find('i').attr('class', 'fa fa-chevron-right');
            } else {
                this.singlePlugin.select();
                this.$el.find('i').attr('class', 'fa fa-chevron-left');
            }
        }
    });
}(Geosite));
