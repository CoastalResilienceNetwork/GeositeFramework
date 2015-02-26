/*jslint nomen:true, devel:true */
/*global Geosite, $, _, gapi*/

require(['use!Geosite'], function (N) {
    'use strict';

    N.controllers.Launchpads = function (launchpadsConfig) {
        this.collection = new N.collections.Launchpads();
        initLaunchpads(launchpadsConfig, this.collection);
    };

    N.models.Launchpad = Backbone.Model.extend({
        initialize: function() {
            var categories = this.get('categories');
            _.each(categories, function(category, catIdx) {
                _.each(category.issues, function(issue, issueIdx) {
                    var idComponents = [catIdx, issue.name.replace(/ /, '-'), issueIdx];
                    issue.id = idComponents.join('-').toLowerCase();
                });
            });
        }
    });

    N.collections.Launchpads = Backbone.Collection.extend({
        model: N.models.Launchpad
    });

    N.views.Launchpad = Backbone.View.extend({
        initialize: function () {
            this.template = N.app.templates['template-launchpad'];

            if (this.model.get('showByDefault')) {
                this.render();
            }
        },

        events: {
            'click .subregion': 'activateSubRegion',
            'click .lp-issue-btn': 'activateScenario'
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

        activateSubRegion: function(e) {
            var eventData = {
                mapId: null,
                id: $(e.currentTarget).data('subregion-id')
            };

            this.activateLaunchpadEvent('launchpad:activate-subregion', eventData);
        },
        
        activateScenario: function(e) {
            var categories = _(this.model.get('categories')),
                issueId = $(e.currentTarget).data('issue-id'),
                issue;

            categories.each(function(category) {
                if (issue) { return false; }

                issue = _(category.issues).findWhere({id: issueId}) 
            });

            if (issue) { 
                this.activateLaunchpadEvent('launchpad:activate-scenario', issue.saveCode);
            }
        },
        
        activateLaunchpadEvent: function(eventName, eventData) {
            this.remove();
            TINY.box.hide();
            N.app.dispatcher.trigger(eventName, eventData);
            
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
                var launchpad = new N.models.Launchpad(launchpadConfig);
                launchpad.set({ "subregions": N.app.data.region.subregions });
                launchpadCollection.add(launchpad);

                var launchpadView = new N.views.Launchpad({ model: launchpad });

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
