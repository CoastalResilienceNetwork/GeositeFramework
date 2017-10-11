/*jslint nomen:true, devel:true */
/*global Backbone, _, $, Geosite*/

// A pane represents the app work area and contains a sidebar and a map

require([
    'use!Geosite',
    'esri/geometry/Extent',
    'esri/SpatialReference'], function (N, Extent, SpatialReference) {

    (function () {
        'use strict';

        function initialize(model) {
            initMap(model);
            createPlugins(model);
        }

        function initMap(model) {
            var extent = getHomeExtent(model),
                mapModel = new N.models.Map({
                    basemaps: model.get('regionData').basemaps,
                    extent: extent,
                    mapNumber: model.get('paneNumber')
                });
            model.set('mapModel', mapModel);

            initializeSubregionDisplays(mapModel, model);

        }

        function initializeSubregionDisplays(mapModel, pane) {
            function turnOffPlugins() {
                pane.get('plugins').invoke('turnOff');
            }

            mapModel.on('subregion-activate', function(activeRegion) {
                pane.set('activeSubregion', activeRegion);
                turnOffPlugins();
                invokeOnPlugins(pane, 'subregionActivated', [activeRegion, pane]);
                setSidebarPluginVisibility(pane, activeRegion.availablePlugins);
            });

            mapModel.on('subregion-deactivate', function(deactivatedRegion) {
                pane.set('activeSubregion', null);
                invokeOnPlugins(pane, 'subregionDeactivated', [deactivatedRegion, pane]);
                turnOffPlugins();
                showAllSidebarPlugins(pane);
            });
        }

        function showAllSidebarPlugins(pane) {
            setSidebarPluginVisibility(pane, []);
        }

        function setSidebarPluginVisibility(pane, availablePlugins) {
            // Hide any plugins which are not available, but if none are specifically made
            // available, all will be available.

            var plugins = pane.get('plugins'),
                anyAvailable = !_.isEmpty(availablePlugins);

            plugins.each(function(plugin) {
                var type = plugin.get('pluginObject').toolbarType,
                    pluginLauncherSelector = '.' + plugin.getId() + '-' + pane.get('paneNumber');

                if (anyAvailable && type === 'sidebar'
                    && !_.contains(availablePlugins, plugin.getId())) {
                    $(pluginLauncherSelector).hide();

                    // Also hide the ui container if it happens to be showing.
                    plugin.get('$uiContainer').hide();
                } else {
                    $(pluginLauncherSelector).show();
                }
            });
        }

        function invokeOnPlugins(model, methodName, args) {
            var plugins = model.get('plugins');
            plugins.each(function(plugin) {
                var pluginObj = plugin.model.get('pluginObject');
                if (_.isFunction(pluginObj[methodName])) {
                    pluginObj[methodName].apply(pluginObj, args);
                }
            });
        }

        function getHomeExtent(model) {
            var x = model.get('regionData').initialExtent,
                extent = new Extent(
                    x[0], x[1], x[2], x[3],
                    new SpatialReference({
                        wkid: 4326 /*lat-long*/
                    })
                );
            return extent;
        }

        function createPlugins(model) {
            // Iterate over plugin classes in top-level namespace,
            // instantiate them, and wrap them in backbone objects

            var plugins = new N.collections.Plugins(),
                regionData = model.get('regionData');

            _.each(N.plugins, function(PluginClass, i) {
                try {
                    var pluginObject = new PluginClass(),
                        plugin = new N.models.Plugin({
                            pluginObject: pluginObject,
                            pluginSrcFolder: regionData.pluginFolderNames[i]
                        });

                    // Load plugin only if it passes a compliance check ...
                    if (!plugin.isCompliant()) {
                        console.log('Plugin: Pane[' + model.get('paneNumber') + '] - ' +
                            pluginObject.toolbarName +
                            ' is not loaded due to improper interface');
                        return;
                    }

                    // If we're on map 2, and the plugin isn't on the blacklist
                    if (model.get('paneNumber') === 1) {
                        var pluginAvailableForMap = getPluginMap2Availability(plugin.getId());
                        if (!pluginAvailableForMap) {
                            return;
                        }
                    }

                    // If this plugin is the launchpad, but that feature is not configured in the
                    // region config, don't create it.
                    var srcFolder = plugin.get('pluginSrcFolder'),
                        pluginRoot = srcFolder.substring(srcFolder.lastIndexOf('/') + 1);

                    if (pluginRoot === 'launchpad' && !regionData.launchpad) {
                        return;
                    }

                    // All checks are valid against this plugin
                    plugins.add(plugin);

                } catch(e) {
                    console.error("/ --------------------");
                    console.error("There was a problem creating a plugin.");
                    console.error("The plugin launcher for this plugin will not appear in the sidebar.");
                    console.error(e.stack);
                    console.error("-------------------- /");
                }
            });

            model.set('plugins', plugins);
        }

        function getPluginMap2Availability(pluginId) {
            if (_.indexOf(N.app.data.region.map2PluginBlacklist, pluginId) === -1) {
                return true;
            }

            return false;
        }

        // initPlugins() is separate from createPlugins() because:
        //     - We need to create plugin objects before rendering (so we can render their toolbar names).
        //     - We need to pass a map object to the plugin constructors, but that isn't available until after rendering.

        function initPlugins(model, esriMap) {
            var mapModel = model.get('mapModel'),
                regionData = model.get('regionData'),
                savedState = model.get('stateOfPlugins'),
                // Either the launchpad or the specified plugin for single plugin mode
                initialPlugin = null;

            model.get('plugins').each(function(pluginModel) {
                if (checkName(pluginModel, 'launchpad') || N.app.singlePluginMode) {
                    initialPlugin = pluginModel;
                }

                pluginModel.initPluginObject(regionData, mapModel, esriMap);
            });

            // Wait a second before activating a permalink (scenario) to ensure the map
            // layer is loaded.
            _.delay(function() {
                activateScenario(model, savedState, model.get('activeSubregion'));

                // If no savedState and there is a launchpad plugin, active it first.
                // A saveCode key would indicate that another plugin should be active
                if (Object.keys(savedState).length === 0 && initialPlugin) {
                    initialPlugin.toggleSelected();
                }
            }, 1000);
        }

        function checkName(pluginModel, nameToCheck) {
            if (pluginModel.name().indexOf('/' + nameToCheck) > -1) {
                return true;
            }
            return false;
        }

        function activateScenario(pane, stateOfPlugins, activeSubregion) {
            var mapNumber = pane.get('mapModel').get('mapNumber');
            if (activeSubregion) {
                N.app.dispatcher.trigger('launchpad:activate-subregion', {
                    id: activeSubregion.id,
                    preventZoom: true,
                    mapNumber: mapNumber
                });
            } else {
                N.app.dispatcher.trigger('launchpad:deactivate-subregion', { mapNumber: mapNumber });
            }

            // For each plugin, turn it off to remove any currently loaded state, then
            // once it is completely off, set the state of the plugin if it is participating
            // in this scenario.  If it did have state, inform it that it is now active.
            pane.get('plugins').each(function(pluginModel) {
                pluginModel.turnOff(function() {
                    var stateWasSet = pane.setPluginState(pluginModel, stateOfPlugins, activeSubregion);
                    if (stateWasSet) {
                        pluginModel.get('pluginObject').activate(activeSubregion);
                    }
                });
            });
        }

        N.models = N.models || {};
        N.models.Pane = Backbone.Model.extend({
            defaults: {
                paneNumber: 0,
                regionData: null,
                mapModel: null,
                plugins: null,
                stateOfPlugins: {}
            },

            initialize: function() {
                var self = this;

                N.app.dispatcher.on('launchpad:activate-scenario', function(scenarioState) {
                    var state = Backbone.HashModels.decodeStateObject(scenarioState),
                        paneState = state['pane' + self.get('paneNumber')],
                        pluginState = {},
                        activeSubregion = null;

                    if (paneState && paneState.stateOfPlugins) {
                        pluginState = paneState.stateOfPlugins;
                        activeSubregion = paneState.activeSubregion;
                    }

                    activateScenario(self, pluginState, activeSubregion);
                });

                return initialize(this);
            },

            initPlugins: function(esriMap) { return initPlugins(this, esriMap); },

            setPluginState: function(pluginModel, savedState) {
                var stateWasSet = false;

                if (savedState) {
                    // If the saved state included data for this plugin, set it.
                    if (savedState.plugins) {
                        var pluginState = savedState.plugins[pluginModel.name()],
                            pluginObject = pluginModel.get('pluginObject');

                        if (pluginState) {
                            // Turn the plugin off in case it has currently loaded state
                            // which should be reset prior to setting the new state
                            pluginObject.hibernate();
                            pluginModel.setState(pluginState, savedState.activeSubregion);
                            stateWasSet = true;
                        } else {
                            pluginObject.hibernate();
                        }
                    }

                    // If this plugin was selected, whether it set data or not,
                    // select the plugin to activate.
                    if (savedState.selectedPlugin === pluginModel.name()) {
                        pluginModel.select();
                    }
                }

                return stateWasSet;
            }
        });

    }());

    (function () {
        'use strict';

        function initialize(view) {
            render(view);
            initBasemapSelector(view);
            initSidebarToggle(view);
            initMapView(view);
            initPluginViews(view);
            if (N.app.singlePluginMode) {
                initSinglePluginMode(view);
            }

            // For on demand export initialization. See Layer Selector print, for example.
            var paneNumber = view.model.get('paneNumber');
            N.app.dispatcher.on('export-map:pane-' + paneNumber, function() {
                view.exportMap();
            });
        }

        function render(view) {
            var paneTemplate = N.app.templates['template-pane'],
                html = paneTemplate(view.model.toJSON());
            view.$el.append(html);
        }

        function initBasemapSelector(view) {
            new N.views.BasemapSelector({
                model: view.model.get('mapModel'),
                el: view.$('.basemap-selector')
            });
        }

        function initSidebarToggle(view) {
            new N.views.SidebarToggle({
                el: view.$('#sidebar-toggle')
            });
        }

        function initSinglePluginMode(view) {
            initTogglePlugin(view);
            initMobileTogglePlugin(view);
            initSinglePluginModeHelp(view);
        }

        function initTogglePlugin(view) {
            var togglePluginView = new N.views.TogglePlugin({
                el: view.$('#toggle-plugin-container'),
                viewModel: view.model
            });

            togglePluginView.$el.show();
        }

        function initMobileTogglePlugin(view) {
            var mobileTogglePluginView = new N.views.MobileTogglePlugin({
                viewModel: view.model
            });

            mobileTogglePluginView.$el.show();
        }

        function initSinglePluginModeHelp(view) {
            new N.views.SinglePluginModeHelp({
                el: view.$('#single-plugin-mode-help-container'),
                viewModel: view.model
            });
        }

        function initMapView(view) {
            view.mapView = new N.views.Map({
                model: view.model.get('mapModel'),
                el: view.$('.map'),
                paneNumber: view.model.get('paneNumber')
            });

            var esriMap = view.mapView.esriMap;

            // Wait for the map to load
            dojo.connect(esriMap, "onLoad", function() {
                // Initialize plugins now that all map properties are available (e.g. extent)
                view.model.initPlugins(esriMap);

                // Framework level support for identify is off by default and must
                // be enabled in the region config
                if (view.model.get('regionData').identifyEnabled) {
                    // Clicking the map means "Identify" contents at a point
                    dojo.connect(esriMap, "onClick", tryIdentify);
                }
            });

            function tryIdentify(event) {
                // Check if 'identify' is possible and then execute.
                //
                // the framework level 'identify' feature can be disabled by
                // an active plugin if the plugin uses the map click for another
                // purpose.
                if (!view.model.get('regionData').identifyEnabled) {
                    return;
                }
                var pluginModels = view.model.get('plugins');
                if (!pluginModels.selected ||
                    pluginModels.selected.get('pluginObject').allowIdentifyWhenActive) {
                    view.mapView.doIdentify(pluginModels, event);
                }
            }
        }

        function initPluginViews(view) {
            // create a view for each plugin model (it will render), and add its element
            // to the appropriate plugin section
            var $sidebar = view.$('.plugins'),
                $maptopbar = view.$('.top-tools'),
                $mapbar = view.$('.tools'),
                regionData = view.model.get('regionData'),
                plugins = view.model.get('plugins'),
                invalidPlugins = plugins.reject(function(plugin) {
                    return plugin.get('pluginObject').validate(regionData);
                });

            plugins.remove(invalidPlugins);

            plugins.each(function(plugin) {
                var toolbarType = plugin.get('pluginObject').toolbarType;
                if (toolbarType === 'sidebar') {
                    new N.views.SidebarPlugin({
                        model: plugin,
                        $parent: $sidebar,
                        paneNumber: view.model.get('paneNumber')
                    });
                } else {
                    var $parent = null;
                    if (toolbarType === 'maptop') {
                        $parent = $maptopbar;
                    } else if (toolbarType === 'map') {
                        $parent = $mapbar;
                    } else {
                        throw "Invalid plugin toolbarType: '" + toolbarType + "'";
                    }
                    new N.views.TopbarPlugin({
                        model: plugin,
                        $parent: $parent
                    });
                }
            });
        }

        N.views = N.views || {};
        N.views.Pane = Backbone.View.extend({
            mapView: null,

            initialize: function(view) { initialize(this); },

            events: {
                'click .export-button': 'exportMap'
            },

            exportMap: function exportMap() {
                var model = new N.models.ExportTool({
                        esriMap: this.mapView.esriMap,
                        paneNumber: this.model.get('paneNumber')
                    }),
                    view = new N.views.ExportTool({ model: model });
                view.render();
            },

            saveState: function() {
                /*
               Traverse all child objects and either tell them to
               save their state if they are a backbone model registered
               with hashmodels, or get their state from them and stick
               it in our own model's pluginState object.
            */
                var plugins = this.model.get('plugins'),
                    stateOfPlugins = {},
                    selected = null;

                plugins.each(function(plugin) {
                    var state = plugin.getState();

                    // Track which plugin is open
                    if (plugin.selected && !selected) {
                        selected = plugin.name();
                    }
                    if (state && Object.keys(state).length > 0) {
                        stateOfPlugins[plugin.name()] = state;
                    }
                });

                var savedState = {
                    selectedPlugin: selected,
                    activeSubregion: this.model.get('activeSubregion'),
                    plugins: stateOfPlugins
                };
                this.model.set('stateOfPlugins', savedState);

                // backbone objects that are tracked by HashModels
                this.mapView.saveState();
            }

        });
    }());
});