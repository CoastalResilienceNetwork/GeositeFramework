/*jslint nomen:true, devel:true */
/*global Geosite, $, _, gapi*/

require(['use!Geosite'], function (N) {
    'use strict';

    N.controllers.Launchpads = function (launchpadsConfig) {
        this.collection = new N.collections.Launchpads();
        initLaunchpads(launchpadsConfig, this.collection);
    }

    N.models.Launchpad = Backbone.Model.extend({});

    N.collections.Launchpads = Backbone.Collection.extend({
        model: N.models.Launchpad
    });

    N.views.Launchpad = Backbone.View.extend({
        initialize: function () {
            this.template = N.app.templates['template-launchpad'];
        },

        events: {
            'click .subregion': 'activateSubRegion'
        },

        render: function () {
            var self = this;

            TINY.box.show({
                html: self.template(self.model.toJSON()),
                boxid: '',
                width: 750,
                height: 450,
                fixed: false,
                maskopacity: 40,
                openjs: function () {
                    self.setElement($('.launchpad'));
                },
                closejs: function () {
                    self.remove();
                }
            });
        },

        activateSubRegion: function (e) {
            var eventData = {
                mapId: null,
                subRegionId: $(e.target).data('subregion-id')
            };

            this.remove();
            TINY.box.hide();
            N.app.dispatcher.trigger('launchpad:activate-subregion', eventData);
        }
    });

    function initLaunchpads(launchpadsConfig, launchpadCollection) {
        var $launchpadTriggers = $('a.launchpad-trigger');

        _.each($launchpadTriggers, function (trigger) {
            var launchpadId = $(trigger).data('launchpad-id'),
                launchpadConfig = getLaunchpadConfig(launchpadsConfig, launchpadId);

            if (!launchpadConfig) {
                Azavea.logError("No configuration found for launchpad id " + launchpadId);
            } else {
                var launchpad = new N.models.Launchpad(launchpadConfig),
                    launchpadView = new N.views.Launchpad({ model: launchpad });

                launchpad.set({ "subregions": N.app.data.region.subregions });
                launchpadCollection.add(launchpad);
                registerLaunchpadHandler(trigger, launchpadView);
            }
        }, this);
    }

    function getLaunchpadConfig(launchpadConfigs, launchpadId) {
        return _.find(launchpadConfigs, function(config) {
            return config.id === launchpadId;
        });
    }

    function registerLaunchpadHandler(trigger, launchpadView) {
        $(trigger).click(function () {
            launchpadView.render();
        });
    }
});
