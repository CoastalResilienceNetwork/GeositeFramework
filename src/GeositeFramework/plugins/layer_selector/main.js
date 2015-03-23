﻿// "layer_selector" plugin, main module

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

            _layerManager: null,
            _ui: null,
            _currentState: {},

            initialize: function (frameworkParameters) {
                declare.safeMixin(this, frameworkParameters);
                this._layerManager = new LayerManager(this.app);
                this._ui = new Ui(this.container, this.map, templates);

                // Load layer sources, then render UI passing the tree of layer nodes
                var self = this;
                this._layerManager.load(this.getLayersJson(), function (tree) {
                    if (self._currentState) {
                        self._layerManager.setServiceState(self._currentState, self.map);
                    }
                    self._ui.render(tree);
                    $('a.pluginLayerSelector-clear', self.container).click(function() {
                        self.clearAll();
                    });
                });
            },

            getLayersJson: function() {
                return layerSourcesJson;
            },

            activate: function () {
                if (this._currentState) {
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

            clearAll: function () {
                if (! this._ui.isRendered()) {
                    return;
                }

                this._layerManager.hideAllLayers(this.map);
                this._layerManager.clearServiceState();
                this._ui.uncheckAndCollapse();
                this._currentState = {};
            },
            
            subregionActivated: function(subregion) {
                console.debug('now using subregion ' + subregion.display);
            },
            
            subregionDeactivated: function(subregion) {
                console.debug('now leaving subregion ' + subregion.display);
            }

        });
    }
);
