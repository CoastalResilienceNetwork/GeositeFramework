// "layer_selector" plugin, main module

// Plugins should load their own versions of any libraries used even if those libraries are also used 
// by the GeositeFramework, in case a future framework version uses a different library version. 

require({
    // Specify library locations.
    // The calls to location.pathname.replace() below prepend the app's root path to the specified library location. 
    // Otherwise, since Dojo is loaded from a CDN, it will prepend the CDN server path and fail, as described in
    // https://dojotoolkit.org/documentation/tutorials/1.7/cdn
    packages: [
        {
            name: "jquery",
            location: "//ajax.googleapis.com/ajax/libs/jquery/1.9.0",
            main: "jquery.min"
        },
        {
            name: "underscore",
            location: "//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.4.4",
            main: "underscore-min"
        },
        {
            name: "extjs",
            location: "//d16l3xhd6wlg5a.cloudfront.net",
            main: "ext-all"
        },
        {
            name: "jquery.placeholder",
            location: location.pathname.replace(/\/[^/]+$/, "") + "plugins/layer_selector/lib",
            main: "jquery.placeholder.amd.min"
        },
        {
            name: "tv4",
            location: location.pathname.replace(/\/[^/]+$/, "") + "plugins/layer_selector/lib",
            main: "tv4.min"
        }
    ]
});

define([
        "dojo/_base/declare",
        "framework/PluginBase",
        "./LayerManager",
        "./Ui",
        "dojo/text!./layers.json",
        "dojo/text!./templates.html",
        "jquery"
    ],
    function (declare, PluginBase, LayerManager, Ui, layerSourcesJson, templates, $) {

        return declare(PluginBase, {
            toolbarName: "Map Layers",
            fullName: "Configure and control layers to be overlayed on the base map.",
            toolbarType: "sidebar",
            allowIdentifyWhenActive: true,
            hasCustomPrint: true,

            _layerManager: null,
            _ui: null,
            _currentState: {},

            initialize: function (frameworkParameters, currentRegion) {
                // Only mixin the params if they're initially supplied by the framework
                var self = this;
                if (frameworkParameters) {
                    declare.safeMixin(this, frameworkParameters);
                }

                // If the layer exists and we are re-initializing, make sure no layers
                // remain from the previous instance
                if (this._layerManager) { 
                    this._layerManager.hideAllLayers();
                    delete this._layerManager;
                }

                this._layerManager = new LayerManager(this.app);
                $(this.container).empty();

                // It's important to keep references of Ui locally scoped because
                // it's possible to initialize the plugin again before the onLoaded
                // function has been called, which might actually be swapping out the
                // instance saved on this.  Give the version a unique id so to avoid
                // confusion.  Also, the ext controls seem to hold on to memory so be
                // explicit about removing references when re-initializing
                if (this._ui) {
                    this._ui.cleanUp();
                    delete this._ui;
                }

                var ui = this._ui = new Ui(this.container, this.map, templates);
                ui.instanceId = new Date().getTime();

                var onLoaded = function (tree) {

                    if (!_.isEmpty(self._currentState)) {
                        self._layerManager.setServiceState(self._currentState, self.map);
                    }

                    // Only render the tree when the local version is also the instance 
                    // version.  This ignores earlier initializations if they haven't completed
                    // yet.
                    if (ui.instanceId == self._ui.instanceId) {
                        ui.render(tree);
                        delete ui;
                    }

                    $('a.pluginLayerSelector-clear', self.container).click(function() {
                        self.clearAll();
                    });
                };

                // Load layer sources, then render UI passing the tree of layer nodes
                var self = this,
                    region = currentRegion || 'main';
                    
                this._layerManager.load(this.getLayersJson(), region, onLoaded);

            },

            getLayersJson: function(){
                return layerSourcesJson;
            },

            activate: function (activeSubregion) {
                if (!_.isEmpty(this._currentState) && !activeSubregion) {
                    this._layerManager.setServiceState(this._currentState, this.map);
                }
                this._ui.display();
            },

            deactivate: function () {
                this._ui.hideAll();
                this._currentState = this._layerManager.getServiceState();
            },

            onContainerVisibilityChanged: function(visible) {
                this._ui.display();
            },

            hibernate: function () {
                this.clearAll();
            },

            resize: function (dx, dy) {
                this._ui.onContainerSizeChanged(dx, dy);
            },

            getState: function () {
                return this._layerManager.getServiceState();
            },

            setState: function (state) {
                this._currentState = state;
            },

            clearAll: _.debounce(function () {
                if (! this._ui || ! this._ui.isRendered()) {
                    return;
                }

                this._layerManager.hideAllLayers(this.map);
                this._layerManager.clearServiceState();
                this._ui.uncheckAndCollapse();
                this._currentState = {};
            }, 600, true),
            
            subregionActivated: function(subregion) {
                this.initialize(null, subregion.id);
            },
            
            subregionDeactivated: function(subregion) {
                this.clearAll();
                this.initialize(null, 'main');
            },

            beforePrint: function(printDeferred) {
                // We can short circuit the plugin print chain by simply
                // rejecting this deferred object.  
                printDeferred.reject();

                // Trigger an export dialog for this pane.
                this.app.dispatcher.trigger('export-map:pane-' + this.app.paneNumber);
            }

        });
    }
);
