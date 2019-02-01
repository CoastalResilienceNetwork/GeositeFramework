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

    // Mobile toggle full screen content view for single plugin mode
    N.views.MobileToggleFullMap = Backbone.View.extend({
        el: '.mobile-full-map-toggle',

        events: {
            'click': 'setFullMap',
        },

        initialize: function(options) {
            this.mobileToggleButton = $('#mobile-content-toggle');
            this.fullMapButton = this.$el;
            this.pluginSidebar = $('.sidebar');
            this.mapRef = $('.map');

        },

        setFullMap: function() {
            // set correct classes on map and sidebar, hide full map toggle button
            this.pluginSidebar.removeClass('sidebar-peeking').removeClass('sidebar-max').addClass('sidebar-min');
            this.mapRef.removeClass('map-peeking').removeClass('map-min').addClass('map-max');
            // set content of mobile toggle tab
            this.mobileToggleButton.find('i').attr('class', 'fa fa-chevron-up');
            this.mobileToggleButton.find('.mobile-toggle-text').html('view data');
            // show full map button
            this.fullMapButton.hide();
        },

    });

    // Mobile toggle content view for single plugin mode
    N.views.MobileTogglePluginContent = Backbone.View.extend({
        el: '#mobile-content-toggle',

        events: {
            'click': 'handleContentToggleClick',
        },

        initialize: function(options) {
            this.viewModel = options.viewModel;
            this.listenTo(this.viewModel, 'change', this.handleContentToggleClick);

            this.mobileToggleButton = this.$el;
            this.fullMapButton = $('.mobile-full-map-toggle');
            this.pluginSidebar = $('.sidebar');
            this.mapRef = $('.map');
        },

        handleContentToggleClick() {
            if(this.pluginSidebar.hasClass('sidebar-peeking')) {
                this.setFullContent();
            } else {
                this.setPeekingView();
            }
        },

        setFullContent: function() {
            // set correct classes on map and sidebar, full map toggle button state?
            this.pluginSidebar.removeClass('sidebar-peeking').removeClass('sidebar-min').addClass('sidebar-max');
            this.mapRef.removeClass('map-peeking').removeClass('map-max').addClass('map-min');
            // set content of mobile toggle tab
            this.mobileToggleButton.find('i').attr('class', 'fa fa-chevron-down');
            this.mobileToggleButton.find('.mobile-toggle-text').html('view less data');
            // hide full map button
            this.fullMapButton.show();
        },

        setPeekingView: function() {
            // set correct classes on map and sidebar, how full map toggle button
            this.pluginSidebar.removeClass('sidebar-max').removeClass('sidebar-min').addClass('sidebar-peeking');
            this.mapRef.removeClass('map-min').removeClass('map-max').addClass('map-peeking');
            // set content of mobile toggle tab
            this.mobileToggleButton.find('i').attr('class', 'fa fa-chevron-up');
            this.mobileToggleButton.find('.mobile-toggle-text').html('view more data');
            // show full map button
            this.fullMapButton.show();
        }
    });
}(Geosite));
