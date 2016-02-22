define([
        "dojo/_base/declare",
        "underscore"
    ],
    function(declare,
             _) {
        "use strict";

        return declare(null, {
            constructor: function(data) {
                this.setState(data);
            },

            getState: function() {
                return this.savedState;
            },

            setState: function(data) {
                this.savedState = _.defaults({}, data, {
                    filterText: '',
                    // Selected layerIds (in-order).
                    selectedLayers: [],
                    // Expanded layerIds.
                    expandedLayers: [],
                    // List of objects as { layerId: opacityValue }.
                    layerOpacity: [],
                    // Layer id that infobox is display for.
                    infoBoxLayerId: null
                });
            },

            clearAll: function() {
                this.setState(null);
            },

            toggleLayer: function(layer) {
                var layerId = layer.id();
                if (layer.isFolder()) {
                    if (this.isExpanded(layerId)) {
                        this.collapseLayer(layerId);
                    } else {
                        this.expandLayer(layerId);
                    }
                } else {
                    if (this.isSelected(layerId)) {
                        this.deselectLayer(layerId);
                    } else {
                        this.selectLayer(layerId);
                    }
                }
            },

            getSelectedLayers: function() {
                return this.savedState.selectedLayers;
            },

            isSelected: function(layerId) {
                return _.contains(this.savedState.selectedLayers, layerId);
            },

            selectLayer: function(layerId) {
                this.savedState.selectedLayers.push(layerId);
            },

            deselectLayer: function(layerId) {
                this.savedState.selectedLayers = _.without(this.savedState.selectedLayers, layerId);
            },

            isExpanded: function(layerId) {
                return _.contains(this.savedState.expandedLayers, layerId);
            },

            expandLayer: function(layerId) {
                this.savedState.expandedLayers.push(layerId);
            },

            collapseLayer: function(layerId) {
                this.savedState.expandedLayers = _.without(this.savedState.expandedLayers, layerId);
            },

            collapseAllLayers: function() {
                this.savedState.expandedLayers = [];
            },

            getFilterText: function() {
                return this.savedState.filterText.trim();
            },

            setFilterText: function(filterText) {
                this.savedState.filterText = filterText;
            },

            getLayerOpacity: function(layerId) {
                var savedLayerOpacity = _.findWhere(this.savedState.layerOpacity, { layerId: layerId });
                return savedLayerOpacity && savedLayerOpacity.opacity;
            },

            setLayerOpacity: function(layerId, opacity) {
                var layerItem = _.findWhere(this.savedState.layerOpacity, { layerId: layerId });

                if (layerItem) {
                    layerItem.opacity = opacity;
                } else {
                    this.savedState.layerOpacity.push({
                        layerId: layerId,
                        opacity: opacity
                    });
                }
            },

            setInfoBoxLayerId: function(layerId) {
                this.savedState.infoBoxLayerId = layerId;
            },

            clearInfoBoxLayerId: function() {
                this.savedState.infoBoxLayerId = null;
            },

            getInfoBoxLayerId: function() {
                return this.savedState.infoBoxLayerId;
            },

            infoIsDisplayed: function(layerId) {
                return this.savedState.infoBoxLayerId === layerId;
            },

            setCurrentRegion: function(currentRegion) {
                this.currentRegion = currentRegion;
            },

            getCurrentRegion: function() {
                return this.currentRegion || 'main';
            }
        });
    }
);
