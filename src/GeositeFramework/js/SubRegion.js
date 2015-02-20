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

        // List of functions to call when a sub-region is de/activated
        self.activateCallbacks = [];
        self.deactivateCallbacks = [];

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
            var subRegionGraphic = getSubRegionById(e.subRegionId, self.subRegionLayer);
            // Going to a subregion from the launchpad should only effect
            // the first map.
            var activeMapId = 'map-' + N.app.models.screen.get('mainPaneNumber');
            if (self.map.id === activeMapId) {
                activateSubRegion(subRegionGraphic, self.map, self.activateCallbacks, self.subRegionLayer, Polygon);
            }
        });
        
        // If click-activation is enabled, wire up the event
        if (subregions.clickToFocus) {
            setMouseCursor(self.map, self.subRegionLayer, 'mouse-over', 'pointer');
            setMouseCursor(self.map, self.subRegionLayer, 'mouse-out', 'default');

            // Placeholder, we don't know how regions will deactive yet
            self.subRegionLayer.on('dbl-click',
                _.partial(changeSubregionActivation, self.deactivateCallbacks));

            self.subRegionLayer.on('click', function (e) {
                activateSubRegion(e.graphic, self.map, self.activateCallbacks, self.subRegionLayer, Polygon);
            });

        };
    }

    N.controllers.SubRegion.prototype.onActivated = function(callback) {
        this.activateCallbacks.push(callback);
    };

    N.controllers.SubRegion.prototype.onDeactivated = function(callback) {
        this.deactivateCallbacks.push(callback);
    };

    function activateSubRegion(subRegionGraphic, map, activateCallbacks, subRegionLayer, Polygon) {
        subRegionLayer.hide();
        zoomToSubRegion(subRegionGraphic, map, Polygon);
        changeSubregionActivation(activateCallbacks, subRegionGraphic);
    }

    function changeSubregionActivation(callbacks, subRegionLayer) {
        _.each(callbacks, function(callback) {
            if (_.isFunction(callback)) {
                callback(subRegionLayer.attributes);
            }
        });

        // Prevent the map click from getting to the map, so no identify
        event.stopPropagation();
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
});