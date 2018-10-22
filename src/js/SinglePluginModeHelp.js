(function (N) {
    'use strict';

    var $container;
    var $pluginToggle;
    var $mobileToggle;
    var singlePlugin;
    var viewModel;

    function initialize(view, $el) {
        $container = $el;
        $pluginToggle = $('#toggle-plugin-container');
        $mobileToggle = $('#single-plugin-toggle-footer');

        // Get the content from the developer-provided HTML partial
        var content = $('#single-plugin-mode-help-content').html();

        // Get the template for the help pane
        var tmpl = _.template($('#single-plugin-mode-help-template').html());

        // Insert the template, with the custom contents, to the help pane.
        $container.html(tmpl({ content: content }));

        // It's a bit odd to have this here, but there isn't a more discoverable
        // place for it to be.
        $('#show-single-plugin-mode-help').click(function() {
            $container.show();
            $pluginToggle.hide();
            $mobileToggle.hide();
            singlePlugin.get('$uiContainer').hide();
        });
    }

    function close(view) {
        $container.hide();
        $pluginToggle.show();
        $mobileToggle.show();
        if (singlePlugin.selected) {
            if (!window.matchMedia("screen and (max-device-width: 736px)").matches ||
                viewModel.get('pluginContentVisible')) {
                singlePlugin.get('$uiContainer').show();
            }
        }
    }

    N.views = N.views || {};
    N.views.SinglePluginModeHelp = Backbone.View.extend({
        initialize: function (options) {
            singlePlugin = options.viewModel.get('plugins').at(0),
            viewModel = options.viewModel;
            return initialize(this, $('#single-plugin-mode-help-container'), singlePlugin);
        },
        events: {
            'click .plugin-off': function (e) { close(this, e); }
        }
    });
}(Geosite));
