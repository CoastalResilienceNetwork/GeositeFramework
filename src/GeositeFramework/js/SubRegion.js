require(['use!Geosite',
         'esri/dijit/Popup',
         'esri/geometry/Polygon'
        ],
    function(N,
             Popup,
             Polygon) {

    'use strict';

    N.controllers.SubRegion = function(subregions, map) {
        var self = this,
            tooltip;
        self.map = map;
        self.subregions = subregions;
        self.currentRegionId = null;

        // List of functions to call when a sub-region is de/activated
        self.activateCallbacks = [];
        self.deactivateCallbacks = [];

        // Use the initial extent as the "last" extent when exiting after
        // a series of subregion activations.  Otherwise, the most recent
        // active region extent will be fit, which looks wrong.
        self.initialExtent = parseExtent(N.app.data.region.initialExtent);

        // Graphics layer that will hold the sub-region vectors
        self.subRegionLayer = new esri.layers.GraphicsLayer();
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
        });

        N.app.dispatcher.on('launchpad:activate-subregion', function (e) {
            // Going to a subregion from the launchpad should only effect
            // the first map.
            var activeMapId = 'map-' + N.app.models.screen.get('mainPaneNumber');
            if (self.map.id === activeMapId) {
                self.initializeSubregion(e.id, Polygon);
            }
        });
        
        // If click-activation is enabled, wire up the event
        if (subregions.clickToFocus) {
            setMouseCursor(self.map, self.subRegionLayer, 'mouse-over', 'pointer');
            setMouseCursor(self.map, self.subRegionLayer, 'mouse-out', 'default');

            self.subRegionLayer.on('click', function (e) {
                self.activateSubRegion(e.graphic, Polygon);
            });
        };
    }

    N.controllers.SubRegion.prototype.onActivated = function(callback) {
        this.activateCallbacks.push(callback);
    };

    N.controllers.SubRegion.prototype.onDeactivated = function(callback) {
        this.deactivateCallbacks.push(callback);
    };

    N.controllers.SubRegion.prototype.initializeSubregion = function(subRegionId, Polygon) {
        var subRegionGraphic = getSubRegionById(subRegionId, this.subRegionLayer);
        activateSubRegion(this, subRegionGraphic, Polygon);
    };

    N.controllers.SubRegion.prototype.activateSubRegion = function(subRegionGraphic, Polygon) {
        var newRegionId = subRegionGraphic.attributes.id,
            extentOnExit = this.map.extent;

        if (this.currentRegionId) {
            if (this.currentRegionId === newRegionId) {
                return;
            }
            var oldRegion = _.findWhere(this.subregions.areas, { id: this.currentRegionId });
            // Use the full extent when exiting this subregion
            extentOnExit = this.initialExtent;
            deactivateSubRegion(this, this.map.extent, oldRegion);
        }

        this.currentRegionId = newRegionId;
        this.currentHeader = addSubRegionHeader(this, subRegionGraphic, extentOnExit);

        this.subRegionLayer.hide();
        zoomToSubRegion(subRegionGraphic, this.map, Polygon);
        changeSubregionActivation(this.activateCallbacks, subRegionGraphic.attributes);
    }

    function deactivateSubRegion(subRegionManager, mapExtent, subRegionLayerAttributes) {
        changeSubregionActivation(subRegionManager.deactivateCallbacks, subRegionLayerAttributes);
        subRegionManager.map.setExtent(mapExtent);
        subRegionManager.subRegionLayer.show();

        if (subRegionManager.currentHeader) {
            subRegionManager.currentHeader.remove();
        }
    }

    function changeSubregionActivation(callbacks, subRegionLayerAttributes) {
        _.each(callbacks, function(callback) {
            if (_.isFunction(callback)) {
                callback(subRegionLayerAttributes);
            }
        });

        // Prevent the map click from getting to the map, so no identify
        event.stopPropagation();
    }

    function parseExtent(coords) {
        return esri.geometry.Extent(
            coords[0], coords[1], coords[2], coords[3],
            new esri.SpatialReference({ wkid: 4326 /*lat-long*/ })
        );
    }

    function addSubRegionsToMap(subregions, layer) {
        _.each(subregions.areas, function(subregion) {
            var geom = new esri.geometry.Polygon(subregion.shape);
            var symbol = new esri.symbol.SimpleFillSymbol();
            symbol.setColor(new dojo.Color(subregion.color || subregions.color));

            var infoTemplate = new esri.InfoTemplate();
            // display is the field containing the subregion name
            infoTemplate.setContent("${display}");

            var graphic = new esri.Graphic(geom, symbol, subregion, infoTemplate);

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
                deactivateFn: _.partial(
                    deactivateSubRegion,
                    subRegionManager,
                    extentOnExit
                )
            });

        $mapContainer.prepend(subRegionHeader.render().$el);
        return subRegionHeader;
    }

    N.models.SubRegion = Backbone.Model.extend({});

    N.views.SubRegionHeader = Backbone.View.extend({
        initialize: function () {
            this.template = N.app.templates['template-subregion'];
            this.$container = this.options.$container;
            this.deactivateFn = this.options.deactivateFn;
            this.subRegionManager = this.options.subRegionManager;
            this.mapControlsToAdjust = [
               '.control-container',
               '.esriSimpleSlider'
            ];
        },

        events: {
            'click .leave a': 'close',
            'change .header-region-selection': 'activateSubregion'
        },

        render: function () {
            this.toggleMapControlPositions();
            this.$el.html(this.template(this.model.attributes));
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

        activateSubregion: function(e) {
            // Don't reset the current region id when activting a subregion
            // when another is activated.  This is how we tell that the "last"
            // extent should be the full extent, not this current regions extent
            this.close(false);
            this.subRegionManager.initializeSubregion(e.target.value, Polygon);
        },

        close: function (resetCurrentRegionId) {
            this.remove();
            this.toggleMapControlPositions();

            var oldRegion = _.findWhere(this.model.attributes.subregions,
                { id: this.model.attributes.selectedId });

            this.deactivateFn(oldRegion);

            if (resetCurrentRegionId) {
                this.subRegionManager.currentRegionId = null;
            }
        }
    });
});