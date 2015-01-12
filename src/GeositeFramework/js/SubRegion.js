(function(N) {

    N.controllers.SubRegion = function(subregions, map) {
        var self = this;
        self.map = map;
        
        // List of functions to call when a sub-region is de/activated
        self.activateCallbacks = [];
        self.deactivateCallbacks = [];

        // Graphics layer that will hold the sub-region vectors
        self.subRegionLayer = new esri.layers.GraphicsLayer();
        self.subRegionLayer.setOpacity(subregions.opacity);
        self.map.addLayer(self.subRegionLayer);

        addSubRegionsToMap(subregions, self.subRegionLayer);

        // If click-activation is enabled, wire up the event
        if (subregions.clickToFocus) {
            setMouseCursor(self.map, self.subRegionLayer, 'mouse-over', 'pointer');
            setMouseCursor(self.map, self.subRegionLayer, 'mouse-out', 'default');

            // Placeholder, we don't know how regions will deactive yet
            self.subRegionLayer.on('dbl-click',
                _.partial(changeSubregionActivation, self.deactivateCallbacks));
             
            self.subRegionLayer.on('click',
                _.partial(changeSubregionActivation, self.activateCallbacks));

        }
    };

    N.controllers.SubRegion.prototype.onActivated = function(callback) {
        this.activateCallbacks.push(callback);
    };

    N.controllers.SubRegion.prototype.onDeactivated = function(callback) {
        this.deactivateCallbacks.push(callback);
    };

    function setMouseCursor(map, layer, eventName, cursor) {
        layer.on(eventName, function() {
            map.setMapCursor(cursor);
        });
    }

    function changeSubregionActivation(callbacks, event) {
        var attributes = event.graphic.attributes;
        
        _.each(callbacks, function(callback) {
            if (_.isFunction(callback)) {
                callback(attributes);
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

            var graphic = new esri.Graphic(geom, symbol);
            graphic.attributes = subregion;

            layer.add(graphic);

        });
    }
}(Geosite));
