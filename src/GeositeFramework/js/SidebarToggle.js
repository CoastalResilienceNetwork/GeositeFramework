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
            this.viewModel = options.viewModel;
            this.viewModel.set('pluginContentVisible', true);
            this.listenTo(this.viewModel, 'change', this.adjustToggleIcon);
        },

        events: {
            'click': 'togglePluginVisibility'
        },

        adjustToggleIcon: function() {
            const newIconClass =
                this.viewModel.get('pluginContentVisible') ?
                'fa fa-chevron-left' : 'fa fa-chevron-right';

            this.$el.find('i').attr('class', newIconClass);
        },

        togglePluginVisibility: function() {
            if (this.viewModel.get('pluginContentVisible')) {
                this.viewModel.set('pluginContentVisible', false);
                this.singlePlugin.deselect();
            } else {
                this.viewModel.set('pluginContentVisible', true);
                this.singlePlugin.select();
            }
        }
    });

    // Mobile toggle view for single plugin mode
    N.views.MobileTogglePlugin = Backbone.View.extend({
        el: 'footer',

        events: {
            'click #single-plugin-toggle-content-button': 'showMobileContent',
            'click #single-plugin-toggle-map-button': 'showMobileMap'
        },

        initialize: function(options) {
            this.viewModel = options.viewModel;
            this.listenTo(this.viewModel, 'change', this.adjustButtonCSS);

            this.mobileMapButton = this.$el.find('#single-plugin-toggle-content-button');
            this.mobileContentButton = this.$el.find('#single-plugin-toggle-map-button');
            this.pluginSidebar = $('.sidebar');

            N.app.showMobileMap = this.showMobileMap.bind(this);
            N.app.showMobileContent = this.showMobileContent.bind(this);
        },

        adjustButtonCSS: function() {
            if (!this.viewModel.get('pluginContentVisible')) {
                this.mobileMapButton.addClass('button-secondary');
                this.mobileContentButton.addClass('button-primary');

                this.mobileMapButton.removeClass('button-primary');
                this.mobileContentButton.removeClass('button-secondary');
            } else {
                this.mobileMapButton.addClass('button-primary');
                this.mobileContentButton.addClass('button-secondary');

                this.mobileMapButton.removeClass('button-secondary');
                this.mobileContentButton.removeClass('button-primary');
            }
        },

        showMobileContent: function() {
            this.pluginSidebar.show();
            this.viewModel.set('pluginContentVisible', true);
        },

        showMobileMap: function() {
            this.pluginSidebar.hide();
            this.viewModel.set('pluginContentVisible', false);
        }
    });
}(Geosite));
