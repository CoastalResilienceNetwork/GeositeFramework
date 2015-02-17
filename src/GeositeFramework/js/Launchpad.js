/*jslint nomen:true, devel:true */
/*global Geosite, $, _, gapi*/

require(['use!Geosite'], function (N) {
    'use strict';

    N.controllers.Launchpads = function(launchpadsConfig) {
        setupLaunchpads(launchpadsConfig);
    }

    function setupLaunchpads(launchpadsConfig) {
        var $launchpadTriggers = $('a.launchpad-trigger');

        _.each($launchpadTriggers, function (trigger) {
            var launchpadId = $(trigger).data('launchpad-id'),
                launchpadConfig = getLaunchpadConfig(launchpadsConfig, launchpadId);

            if (!launchpadConfig) {
                Azavea.logError("No configuration found for launchpad id " + launchpadId);
            } else {
                registerLaunchpadHandler(trigger, launchpadConfig);
            }
        });
    }

    function registerLaunchpadHandler(trigger, launchpadConfig) {
        $(trigger).click(function() {
            TINY.box.show({
                html: JSON.stringify(launchpadConfig),
                boxid: 'frameless',
                width: 750,
                height: 450,
                fixed: false,
                maskopacity: 40
            });
        });
    }

    function getLaunchpadConfig(launchpadConfigs, launchpadId) {
        return _.find(launchpadConfigs, function(config) {
            return config.id === launchpadId;
        });
    }
});
