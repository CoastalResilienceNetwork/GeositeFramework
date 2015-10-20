/*jslint nomen:true, devel:true */
/*global Geosite, $, _, gapi*/

require(['use!Geosite'], function (N) {
    'use strict';

    N.controllers.Launchpads = function (launchpadsConfig) {
        this.collection = new N.collections.Launchpads();
        initLaunchpads(launchpadsConfig, this.collection);
    };

    N.models.Launchpad = Backbone.Model.extend({
        defaults: {
            initial: true
        },

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
            this.initialExtent = parseExtent(N.app.data.region.initialExtent);

            if (this.model.get('showByDefault') && N.app.loadedWithState === false) {
                this.render();
            }
        },

        events: {
            'click .free-explore': 'freeExplore',
            'click .subregion': 'activateSubRegion',
            'click .lp-issue-btn': 'activateScenario'
        },

        render: function () {
            var self = this;

            TINY.box.show({
                html: self.template(self.model.toJSON()),
                boxid: 'launchpad',
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
            var self = this,
                categories = _(this.model.get('categories')),
                $el = $(e.currentTarget),
                issueId = $el.data('issue-id'),
                issue,
                waitBeforeLaunch = this.model.get('initial') ? 2000 : 500;

            // Subsequent runs are no long the intial ones.
            this.model.set('initial', false);

            // Setup a spinner icon on this scenario button
            $el.find('i')
                .removeClass()
                .addClass('fa fa-spinner fa-spin')

            // Wait a few seconds to launch the scenario, so the layer selector
            // has time to hear back from all of the requested layers, sad but true.
            _.delay(function() {
                categories.each(function(category) {
                    if (issue) { return false; }

                    issue = _(category.issues).findWhere({id: issueId}) 
                });

                if (issue) {
                    var saveCode = issue.saveCode,
                        decodedSaveCode = N.app.hashModels.decodeStateObject(saveCode);

                    // If the saved state contains only one map, we want to make
                    // sure to target the active map pane.
                    if (_.size(decodedSaveCode) === 2) {
                        saveCode = modifyStateForActivePane(decodedSaveCode);
                    }

                    self.activateLaunchpadEvent('launchpad:activate-scenario', saveCode);
                }

            }, waitBeforeLaunch);

        },

        freeExplore: function() {
            this.activateLaunchpadEvent('launchpad:deactivate-subregion');
            this.activateLaunchpadEvent('launchpad:free-explore', {
                extent: this.initialExtent
            });
        },
        
        activateLaunchpadEvent: function(eventName, eventData) {
            this.close();
            N.app.dispatcher.trigger(eventName, eventData);
        },

        close: function() {
            this.remove();
            TINY.box.hide();
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

    function modifyStateForActivePane(state) {
        var activePane = N.app.models.screen.get('mainPaneNumber'),
            statePane = getStatePaneNumber(state);

        if (activePane === statePane) {
            return N.app.hashModels.encodeStateObject(state);
        } else {
            // Update the state to act on the active pane, which means
            // changing the keys to map0 -> map1, if the state was for
            // map0, but map1 is the active map, etc.
            var modifiedState = _.object(_.map(state, function(v, k) {
                if (k.search('pane') !== -1) {
                    v.paneNumber = activePane;
                }
                return [k.replace(/\d/, activePane), v];
            }))

           return N.app.hashModels.encodeStateObject(modifiedState);
        }
    }

    function parseExtent(extent) {
        var x = N.app.data.region.initialExtent,
            extent = new esri.geometry.Extent(
                x[0], x[1], x[2], x[3],
                new esri.SpatialReference({ wkid: 4326 /*lat-long*/ })
            );

        return extent;
    }

    // Get the pane number of the saved state.
    // Assumes there is only one pane/map in the state.
    function getStatePaneNumber(state) {
        var stateMap = _.keys(state)[0],
            statePane = parseInt(stateMap.match(/\d/));

        return statePane;
    }
});
