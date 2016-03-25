require(['use!Geosite',
         'esri/dijit/Popup',
         'esri/geometry/Polygon',
         'esri/SpatialReference',
         'esri/layers/GraphicsLayer',
         'esri/symbols/SimpleFillSymbol',
         'esri/symbols/SimpleLineSymbol',
         'esri/InfoTemplate',
         'esri/graphic'
        ],
    function(N,
             Popup,
             Polygon,
             SpatialReference,
             GraphicsLayer,
             SimpleFillSymbol,
             SimpleLineSymbol,
             InfoTemplate,
             Graphic) {

    'use strict';

    N.controllers.SubRegion = function(subregions, map) {
        var self = this,
            tooltip;
        self.map = map;
        self.subregions = subregions;
        self.currentRegionId = null;
        self.hasBeenToggledOff = subregions.hideByDefault;

        // List of functions to call when a sub-region is de/activated
        self.activateCallbacks = [];
        self.deactivateCallbacks = [];

        // Use the initial extent as the "last" extent when exiting after
        // a series of subregion activations.  Otherwise, the most recent
        // active region extent will be fit, which looks wrong.
        self.initialExtent = parseExtent(N.app.data.region.initialExtent);

        // Graphics layer that will hold the sub-region vectors
        self.subRegionLayer = GraphicsLayer();
        self.subRegionLayer.setOpacity(subregions.opacity);
        self.map.addLayer(self.subRegionLayer);

        addSubRegionsToMap(subregions, self.subRegionLayer);

        self.map.graphics.enableMouseEvents();
        tooltip = createTooltip(map, Popup);
        self.subRegionLayer.on('mouse-over', function(e) {
            showTooltip(e, tooltip, Polygon);
        });

        self.subRegionLayer.on('mouse-out', function(e) {
            hideTooltip(e, tooltip);
        });

        // Event fired from the subregion-toggle plugin on click
        N.app.dispatcher.on('subregion-toggle:toggle', function(e) {
            toggleSubRegions(e, self.map.id, self.subRegionLayer);
            self.hasBeenToggledOff = !self.subRegionLayer.visible;
            self.hasBeenToggledOnWhileHidden =
                self.subRegionLayer.visible &&
                self.map.getZoom() >= self.subregions.hideAtZoomLevel;
        });

        N.app.dispatcher.on('launchpad:activate-subregion', function(e) {
            // Going to a subregion from the launchpad should only effect
            // the active map or the first map in split screen view, unless
            // the map id/number has been provided (in the case of launching
            // the scenario). Then the subregion should be activated on the
            // map the state designates.
            if (e.mapNumber) {
                var savedMapId = 'map-' + e.mapNumber;
                if (self.map.id === savedMapId) {
                    self.initializeSubregion(e.id, Polygon, e.preventZoom);
                }
            } else {
                var activeMapId = 'map-' + N.app.models.screen.get('mainPaneNumber');
                if (self.map.id === activeMapId) {
                    self.initializeSubregion(e.id, Polygon, e.preventZoom);
                }
            }
        });

        // If click-activation is enabled, wire up the event
        if (subregions.clickToFocus) {
            setMouseCursor(self.map, self.subRegionLayer, 'mouse-over', 'pointer');
            setMouseCursor(self.map, self.subRegionLayer, 'mouse-out', 'default');

            self.subRegionLayer.on('click', function (e) {
                self.activateSubRegion(e.graphic, Polygon);

                e.stopPropagation();
            });
        };

        if (subregions.hideAtZoomLevel) {
            map.on('zoom-end', function(e) {
                if (e.level >= subregions.hideAtZoomLevel && !self.hasBeenToggledOnWhileHidden) {
                    self.subRegionLayer.hide();
                } else if (!self.hasBeenToggledOff) {
                    self.subRegionLayer.show();
                }
            });
        }
    }

    N.controllers.SubRegion.prototype.onActivated = function(callback) {
        this.activateCallbacks.push(callback);
    };

    N.controllers.SubRegion.prototype.onDeactivated = function(callback) {
        this.deactivateCallbacks.push(callback);
    };

    N.controllers.SubRegion.prototype.initializeSubregion = function(subRegionId, Polygon, preventZoom) {
        var subRegionGraphic = getSubRegionById(subRegionId, this.subRegionLayer);
        this.activateSubRegion(subRegionGraphic, Polygon, preventZoom);
    };

    N.controllers.SubRegion.prototype.activateSubRegion = function(subRegionGraphic, Polygon, preventZoom) {
        var newRegionId = subRegionGraphic.attributes.id,
            extentOnExit = this.map.extent;

        // Deactivate the current subregion if one is active
        if (this.currentRegionId) {
            if (this.currentRegionId === newRegionId) {
                return;
            }
            var oldRegion = _.findWhere(this.subregions.areas, { id: this.currentRegionId });
            // Use the full extent when exiting this subregion
            extentOnExit = this.initialExtent;
            if (this.currentHeader) {
                var keepCurrentRegionId = true;
                this.currentHeader.close(keepCurrentRegionId);
            }
        }

        this.currentRegionId = newRegionId;
        this.currentHeader = addSubRegionHeader(this, subRegionGraphic, extentOnExit);

        this.subRegionLayer.hide();
        changeSubregionActivation(this.activateCallbacks, subRegionGraphic.attributes);

        // If activating a saved state, the map state bbox should take precedent over the
        // configured subregion bbox
        if (!preventZoom) {
            zoomToSubRegion(subRegionGraphic, this.map, Polygon);
        }
    }

    function deactivateSubRegion(subRegionManager, subRegionLayerAttributes) {
        changeSubregionActivation(subRegionManager.deactivateCallbacks, subRegionLayerAttributes);
        subRegionManager.subRegionLayer.show();
    }

    function changeSubregionActivation(callbacks, subRegionLayerAttributes) {
        _.each(callbacks, function(callback) {
            if (_.isFunction(callback)) {
                callback(subRegionLayerAttributes);
            }
        });
    }

    function parseExtent(coords) {
        return esri.geometry.Extent(
            coords[0], coords[1], coords[2], coords[3],
            new SpatialReference({ wkid: 4326 /*lat-long*/ })
        );
    }

    function addSubRegionsToMap(subregions, layer) {
        _.each(subregions.areas, function(subregion) {
            var geom = new Polygon(subregion.shape);
            var symbol = SimpleFillSymbol();
            var outline = new SimpleLineSymbol(
                    SimpleLineSymbol.STYLE_SOLID,
                    new dojo.Color(subregion.outlineColor || subregions.outlineColor), 2);

            symbol.setColor(new dojo.Color(subregion.color || subregions.color));
            symbol.setOutline(outline);
            if (subregion.noFill) {
                symbol.setColor(new dojo.Color([0, 0, 0, 0]));
            }

            var infoTemplate = new InfoTemplate();
            // display is the field containing the subregion name
            infoTemplate.setContent("${display}");

            var graphic = new Graphic(geom, symbol, subregion, infoTemplate);

            layer.add(graphic);
        });
    }

    function createTooltip(map, Popup) {
        var mapContainerId = $(map.__container).parent().parent().attr('id'),
            el = $('#' + mapContainerId).find('.subregion-tooltip')[0],
            tooltip = new Popup({
                map: map,
                anchor: 'top'
            }, el);

        return tooltip;
    }

    function showTooltip(e, tooltip, Polygon) {
        var extent = new Polygon(e.graphic.geometry).getExtent(),
            height = extent.getHeight(),
            zoomLevel = e.graphic._layer._map.getZoom();

        tooltip.setContent(e.graphic.getContent());
        // The Y coordinate of the tooltip should be placed above the
        // graphic, which is a function of the graphic's height and
        // the current map zoom level. The below function performs
        // well at most zoom levels and feature shapes.
        tooltip.offsetY = ((height + 3) * zoomLevel);
        tooltip.show(extent.getCenter());
    }

    function hideTooltip(e, tooltip) {
        tooltip.hide();
    }

    function toggleSubRegions(eventMapId, mapId, subRegionLayer) {
        if (mapId === eventMapId) {
            if (subRegionLayer.visible) {
                subRegionLayer.hide();
            } else {
                subRegionLayer.show();
            }
        }
    }

    function setMouseCursor(map, layer, eventName, cursor) {
        layer.on(eventName, function() {
            map.setMapCursor(cursor);
        });
    }

    function getSubRegionById(subRegionId, subRegionLayer) {
        return _.find(subRegionLayer.graphics, function (layer) {
            return layer.attributes.id === subRegionId;
        });
    }

    function zoomToSubRegion(subRegion, map, Polygon) {
        var extent = new Polygon(subRegion.geometry).getExtent();

        map.setExtent(extent.expand(2));
    }

    function addSubRegionHeader(subRegionManager, subRegionGraphic, extentOnExit) {
        var $mapContainer = $(subRegionManager.map.container),
            subRegionModel = new N.models.SubRegion({
                subregions: subRegionManager.subregions.areas,
                selectedId: subRegionGraphic.attributes.id
            }),
            subRegionHeader = new N.views.SubRegionHeader({
                model: subRegionModel,
                // We need to access to things in the container,
                // but we don't want it to be the $el of the view.
                $container: $mapContainer,
                subRegionManager: subRegionManager,
                extentOnExit: extentOnExit,
                deactivateFn: _.partial(
                    deactivateSubRegion,
                    subRegionManager
                )
            });

        $mapContainer.prepend(subRegionHeader.render().$el);
        return subRegionHeader;
    }

    N.models.SubRegion = Backbone.Model.extend({});

    N.views.SubRegionHeader = Backbone.View.extend({
        initialize: function (options) {
            this.options = options;
            this.template = N.app.templates['template-subregion'];
            this.$container = this.options.$container;
            this.deactivateFn = this.options.deactivateFn;
            this.extentOnExit = this.options.extentOnExit;
            this.subRegionManager = this.options.subRegionManager;
            this.mapControlsToAdjust = [
               '.control-container',
               '.esriSimpleSlider'
            ];
            this.listenTo(N.app.dispatcher, 'launchpad:deactivate-subregion', this.deactivateSubregion);
        },

        events: {
            'click .leave a': 'zoomOutAndClose',
            'change .header-region-selection': 'activateSubregion'
        },

        render: function () {
            this.toggleMapControlPositions();
            this.toggleMapBorder();
            this.$el.html(this.template(this.model.attributes));

            if ($.i18n) {
                $(this.$el).localize();
            }

            return this;
        },

        toggleMapControlPositions: function () {
            _.each(this.mapControlsToAdjust, function (mapControlSelector) {
                var $control = this.$container.find(mapControlSelector);

                if ($control.hasClass('subregion-active')) {
                    $control.removeClass('subregion-active');
                } else {
                    $control.addClass('subregion-active');
                }
            }, this);
        },

        toggleMapBorder: function () {
            var mapContainer = this.subRegionManager.map.__container,
                baseClassName = 'subregion-border-box',
                $borderBoxes = $(mapContainer).find('.' + baseClassName);

            if ($borderBoxes.length) {
                $borderBoxes.remove();
            } else {
                _.each(['bottom', 'left', 'right'], function(borderClass) {
                  $('<div/>', {
                      'class': baseClassName + ' ' + borderClass
                  }).prependTo(mapContainer);
                });
            }
        },

        activateSubregion: function(e) {
            this.subRegionManager.initializeSubregion(e.target.value, Polygon);
        },

        deactivateSubregion: function(e) {
            var viewMapPane = this.subRegionManager.map.id,
                activeMapPane = 'map-' + N.app.models.screen.get('mainPaneNumber'),
                eventMapPane = 'map-' + e.mapNumber;

            // Only deactivate the subregion if this view is managing the active pane and
            // the event was triggered for the pane that this view is managing.
            if (activeMapPane === viewMapPane && eventMapPane === viewMapPane) {
                this.close();
            }
        },

        zoomOutAndClose: function() {
            this.subRegionManager.map.setExtent(this.extentOnExit);
            this.close();
        },

        close: function (keepCurrentRegionId) {
            this.remove();
            this.stopListening();
            this.toggleMapControlPositions();
            this.toggleMapBorder();

            var oldRegion = _.findWhere(this.model.attributes.subregions,
                { id: this.model.attributes.selectedId });

            this.deactivateFn(oldRegion);

            // Don't reset the current region id when activting a subregion
            // when another is activated.  This is how we tell that the "last"
            // extent should be the full extent, not this current regions extent
            if (!keepCurrentRegionId) {
                this.subRegionManager.currentRegionId = null;
            }
        }
    });
});