define([
        "use!underscore",
        "./Feature",
        "dijit/TooltipDialog",
        "dijit/popup"
    ], function (
        _,
        compFeature,
        TooltipDialog,
        popup
    ) {
    var Comparer = Backbone.Model.extend({

        highlightStyle: null,
        highlightGraphic: null,
        currentLayer: null,
        currentFieldInfos: null,
        selectedFeatures: null,
        selectionGraphics: null,
        selectionLayer: null ,
        layerEventHandlers: null,
        getObjectId: null,
        
        defaults: {
            maxSelectableFeatures: 3
        },

        initialize: function(attrs, options) {
            this.options = options;
            this.highlightStyle = this._makeHighlightSymbol();
            this.selectedFeatures = new Backbone.Collection();
            this.selectionLayer = new esri.layers.GraphicsLayer(
                { id: 'compare-feature-selection' });
            this.selectionGraphics = [];
            this.layerEventHandlers = [];

            this.options.map.addLayer(this.selectionLayer);
            this.activate();

            this.dialog = new TooltipDialog({
                'class': "feature-compare-tooltip"
            });
            this.dialog.startup();
        },

        addLayer: function(layerIdx) {
            var model = this;
            // Event handlers need to be disconnected when a layer changes,
            // so they are tracked
            var load, mouseOver, mouseOut, click;
            if (model.layerEventHandlers.length) {
                _.invoke(model.layerEventHandlers, 'remove');
                model.layerEventHandlers = [];
            }

            model.clear();
            var layerInfo = model.get('layers')[layerIdx];

            model.currentLayer = new esri.layers.FeatureLayer(layerInfo.url, {
                mode: esri.layers.FeatureLayer.ON_DEMAND,
                outFields: _.pluck(layerInfo.attrs, "name")
            });

            model.currentLayer.comparerIndex = layerIdx;

            load = model.currentLayer.on('load', function() {
                model.getObjectId = objectIdGetter(layerInfo, model.currentLayer);
                // When the layer is loaded, get a list of just the field infos
                // for which we are using to compare field values.
                model.currentFieldInfos = _.map(layerInfo.attrs, function(field) {
                    return _.findWhere(model.currentLayer.fields, { name: field.name });
                });

                model._addStateSelectedFeatures();
            });

            model.options.map.addLayer(model.currentLayer);

            var clearHighlight = _.bind(model._clearHighlight, model);
            model.options.map.on('zoom-end', clearHighlight);

            mouseOver = model.currentLayer.on('mouse-over', function(e) {
                // When mousing very speedily, the 'mouse-out' event may
                // get skipped, so double check a 'clear' before highlighting
                model._clearHighlight();
                model.highlightGraphic = new esri.Graphic(e.graphic.geometry,
                    model.highlightStyle, e.graphic.attributes);
                model.options.map.graphics.add(model.highlightGraphic);
                model.options.map.setMapCursor('pointer');

                model._showMapFeatureHover.apply(model,
                    [e, e.graphic.attributes[layerInfo.mapDisplayAttribute]]);
            });

            mouseOut = model.options.map.graphics.on('mouse-out', clearHighlight);

            click = model.options.map.graphics.on('click',
                _.bind(model._handleFeatureClick, model));

            model.layerEventHandlers = [load, mouseOver, mouseOut, click];
        },

        clear: function() {
            if (this.currentLayer) {
                this.options.map.removeLayer(this.currentLayer);
                this.currentLayer = null;
                this.selectedFeatures.reset();
            }
            this._clearHighlight();
            this.selectionLayer.clear();
        },

        activate: function() {
            if (this.currentLayer) {
                this.currentLayer.show();
                this.currentLayer.enableMouseEvents();
            }
            this.selectionLayer.show();
            this.selectionLayer.enableMouseEvents();
        },

        hide: function() {
            this._clearHighlight();
            if (this.currentLayer) {
                this.currentLayer.disableMouseEvents();
            }
        },
          
        close: function() {
            this.clear();
        },

        getState: function() {
            var self = this;
            if (!this.currentLayer) { return null; }
            return {
                currentLayerIdx: this.currentLayer.comparerIndex,
                selectedIds: this.selectedFeatures.map(function(feature) {
                    return self.getObjectId(feature);
                })
            };
        },

        setInitialState: function(state) {
            if (!state.currentLayerIdx && state.currentLayerIdx !== 0) {
                return;
            }

            this._preSelectedFeatureIds = state.selectedIds;
            this.addLayer(state.currentLayerIdx);
        },

        getFieldFormatDefinitions: function() {
            return this.get('layers')[this.currentLayer.comparerIndex].attrs;
        },

        _showMapFeatureHover: function(mouseEvent, featureValue) {
            if (featureValue) {
                this.dialog.setContent(featureValue);
                popup.open({
                    popup: this.dialog,
                    x: mouseEvent.pageX + 10,  // offset tip from pointer a bit
                    y: mouseEvent.pageY 
                });
            }
        }, 

        _addStateSelectedFeatures: function() {
            var model = this,
                update = model.currentLayer.on('update-end', function () {
                // Select feature if they were present in saved hash state
                if (model._preSelectedFeatureIds) {
                    var featureGraphics = _.filter(model.currentLayer.graphics, function(g) {
                        return _.contains(model._preSelectedFeatureIds, model.getObjectId(g));
                    });

                    _.each(featureGraphics, model._selectFeature, model);
                    model._preSelectedFeatureIds = null;
                    model.hide();  // State loading means no UI or mouse events
                }

                // We only care about the first update after the layer has
                // loaded, in order to add "state" selections, so stop listening
                // for this event
                update.remove();
            });
        },

        _clearHighlight: function() {
            if (this.highlightGraphic) {
                this.options.map.graphics.remove(this.highlightGraphic);
                this.highlightGraphic = null;
                this.options.map.setMapCursor('default');
            }
            popup.close(this.dialog);
        },

        _handleFeatureClick: function(e) {
            if (this._featureIsSelected(e.graphic)) {
                this._unselectFeature(e.graphic);

            } else if (this._selectionSlotsAvailable()) {
                this._selectFeature(e.graphic);
            }
        },

        _unselectFeature: function(graphic) {
            var self = this,
                objectId = this.getObjectId(graphic),
                features = this.selectedFeatures.filter(function(feature) {
                    return self.getObjectId(feature) == objectId;
                });
            if (features.length) {
                this._removeSelectedFeature(features[0].cid);
            }
        },
        
        _selectFeature: function(featureGraphic) {
            var model = this,
                selectionIndex = model._getNextSelectionIndex(),
                symbol = model._makeSelectionSymbol(selectionIndex),
                graphic = new esri.Graphic(featureGraphic.geometry, symbol),
                selectionAttrs = _.extend(featureGraphic.attributes, {
                    selectionIndex: selectionIndex,
                    selectionColor: model.get('selectionColors')[selectionIndex],
                    fieldInfos: model.getFieldFormatDefinitions()
                }),
                feature = new compFeature.Feature(selectionAttrs);

            // Adding the graphic as an *attribute* of the Feature model adds
            // a circular reference (model -> collection -> models -> collection)
            // which causes an error when the ESRI Print task tries to serialize
            // the graphic for export.  Hang the graphic as a property, as a ref
            // is still needed to remove the graphic when the uses selects it again
            feature.graphic = graphic;
            model.selectedFeatures.add(feature);
            model.selectionLayer.add(graphic);
        },

        _removeSelectedFeature: function(id) {
            var feature = this.selectedFeatures.get(id);
            if (feature) {
                this.selectionLayer.remove(feature.graphic);
                this.selectedFeatures.remove(feature);
            }
        },

        _makeSelectionSymbol: _.memoize(function(selectionIndex) {
            return this._makeSymbol(this.get('highlightOutlineColor'),
                this.get('selectionColors')[selectionIndex]);
        }),
        
        _makeHighlightSymbol: function() {
            return this._makeSymbol(this.get('highlightOutlineColor'),
                this.get('highlightColor'));
        }, 

        _makeSymbol: function(lineColor, fillColor) {
            
            var lineStyle = new esri.symbol.SimpleLineSymbol(
                esri.symbol.SimpleLineSymbol.STYLE_SOLID,
                new dojo.Color(lineColor), 1);

            return new esri.symbol.SimpleFillSymbol(
                esri.symbol.SimpleFillSymbol.STYLE_SOLID,
                lineStyle,
                new dojo.Color(fillColor)
            );
        },

        _selectionSlotsAvailable: function() {
            return this.selectedFeatures.length < this.get('maxSelectableFeatures');
        },
         
        _featureIsSelected: function(feature) {
            var self = this,
                objectId = this.getObjectId(feature);
            return this.selectedFeatures.any(function(existing) {
                return self.getObjectId(existing) === objectId;
            });
        },

        _getNextSelectionIndex: function() {
            // The selection index determines which color the feature is marked as,
            // and is not sequential, because any selection can be sliced from the list
            // so the first available index must be calculated
            var usedIndexes = this.selectedFeatures.pluck('selectionIndex'),
                allIndexes = _.range(this.get('maxSelectableFeatures'));

            return _.difference(allIndexes, usedIndexes)[0];
        }
    });

    var ComparerView = Backbone.View.extend({
        initialize: function() {
            this.render();
            this.model.selectedFeatures.on('add remove reset',
                _.bind(this.renderComparisons, this));
        },

        cleanUp: function() {
            this.$('select').val('');
        },
        
        events: {
            'change select': 'changeSelectedLayer',
            'click .comparer-feature-remove': 'removeSelection'
        },

        render: function() {
            this.$el.append(this.options.templates.body(this.model.toJSON()));
        },

        changeSelectedLayer: function(event) {
            var layerIdx = $(event.target).val();
            if (layerIdx > -1) {
                this.model.addLayer(layerIdx);
            } else {
                this.model.clear();
            }
        },

        renderComparisons: function() {
            var view = this,
                model = view.model,
                featureEls = view.model.selectedFeatures.map(function (feature) {
                    return new compFeature.FeatureView({
                        model: feature,
                        orderedFieldInfos: view.model.currentFieldInfos,
                        el: $(view.options.templates.feature({ id: feature.cid})),
                        valueTemplate: view.options.templates.featureValue,
                        error: function(fieldName, msg) {
                            var logMsg = "Layer: " + model.currentLayer.name + "\n" +
                                "Field: " + fieldName + "\n" +
                                "Error: " + msg;

                            model.options.app.warn("", logMsg);
                        }
                    }).$el;
            });

            var $comps = this.$('.comparer-feature-list'); 

            if (featureEls.length === 0) {
                $comps.empty();
                return;
            }

            featureEls.unshift(
                view.options.templates.featureFields({
                    fieldInfos: view.model.currentFieldInfos
                })
            );
            
            $comps.empty().append.apply($comps, featureEls);
        },
        
        removeSelection: function(evt) {
            var id = $(evt.target).data('id');
            this.model._removeSelectedFeature(id);
        }
    });

    // Return a function that will return the OBJECTID property
    // for a given feature graphic or feature Backbone model.
    var objectIdGetter = function(layerInfo, esriLayer) {
        // Check if OBJECTID field is defined in layer config.
        if (layerInfo.objectIdField) {
            return function(feature) {
                return feature.attributes[layerInfo.objectIdField];
            };
        }

        // Check if an 'esriFieldTypeOID' field is configured on the AGS endpoint.
        var objectIdFields = _.filter(esriLayer.fields, function(field) {
                return field.type == 'esriFieldTypeOID';
            }),
            objectIdField = objectIdFields.length > 0 && objectIdFields[0];
        if (objectIdField) {
            return function(feature) {
                return feature.attributes[objectIdField.name];
            };
        }

        // Backward compatible behavior assumes there will be an attribute called OBJECTID.
        return function(feature) {
            return feature.attributes['OBJECTID'];
        };
    }

    return {
        Comparer: Comparer,
        ComparerView: ComparerView
    };
})