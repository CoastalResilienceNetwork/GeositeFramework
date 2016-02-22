define([
        "dojo/_base/declare",
        "underscore"
    ],
    function(declare, _) {
        "use strict";

        var State = declare(null, {
            constructor: function(data) {
                this.savedState = _.defaults({}, data, {
                    currentRegion: null,
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

            getState: function() {
                return this.savedState;
            },

            toggleLayer: function(layer) {
                var layerId = layer.id();
                if (layer.isFolder()) {
                    if (this.isExpanded(layerId)) {
                        return this.collapseLayer(layerId);
                    } else {
                        return this.expandLayer(layerId);
                    }
                } else {
                    if (this.isSelected(layerId)) {
                        return this.deselectLayer(layerId);
                    } else {
                        return this.selectLayer(layerId);
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
                return this.clone({
                    selectedLayers: this.savedState.selectedLayers.concat(layerId)
                });
            },

            deselectLayer: function(layerId) {
                return this.clone({
                    selectedLayers: _.without(this.savedState.selectedLayers, layerId)
                });
            },

            isExpanded: function(layerId) {
                return _.contains(this.savedState.expandedLayers, layerId);
            },

            expandLayer: function(layerId) {
                return this.clone({
                    expandedLayers: this.savedState.expandedLayers.concat(layerId)
                });
            },

            collapseLayer: function(layerId) {
                return this.clone({
                    expandedLayers: _.without(this.savedState.expandedLayers, layerId)
                });
            },

            collapseAllLayers: function() {
                return this.clone({ expandedLayers: [] });
            },

            getFilterText: function() {
                return this.savedState.filterText.trim();
            },

            setFilterText: function(filterText) {
                return this.clone({ filterText: filterText });
            },

            getLayerOpacity: function(layerId) {
                var savedLayerOpacity = _.findWhere(this.savedState.layerOpacity, { layerId: layerId });
                return savedLayerOpacity && savedLayerOpacity.opacity;
            },

            setLayerOpacity: function(layerId, opacity) {
                var layerOpacity = _.filter(this.savedState.layerOpacity, function(item) {
                    return item.layerId !== layerId;
                });
                return this.clone({
                    layerOpacity: layerOpacity.concat({
                        layerId: layerId,
                        opacity: opacity
                    })
                });
            },

            setInfoBoxLayerId: function(layerId) {
                return this.clone({
                    infoBoxLayerId: layerId
                });
            },

            clearInfoBoxLayerId: function() {
                return this.setInfoBoxLayerId(null);
            },

            getInfoBoxLayerId: function() {
                return this.savedState.infoBoxLayerId;
            },

            infoIsDisplayed: function(layerId) {
                return this.savedState.infoBoxLayerId === layerId;
            },

            setCurrentRegion: function(currentRegion) {
                return this.clone({
                    currentRegion: currentRegion
                });
            },

            getCurrentRegion: function() {
                return this.savedState.currentRegion || 'main';
            },

            // Return new State combined with `data`.
            clone: function(data) {
                return new State(_.assign({}, this.getState(), data));
            }
        });

        return State;
    }
);
