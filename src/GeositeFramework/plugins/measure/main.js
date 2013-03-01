// Main module for GeositeFramework plugin "measure"

define(
    ["dojo/_base/declare", "esri/toolbars/draw"],
    function (declare) {
        return declare(null, {
            toolbarName: "Measure",
            fullName: "Measure distances and area on the map",
            toolbarType: "map",

            initialize: function (args) {
                declare.safeMixin(this, args);
                // Our wrapped map does not seem to work with the Draw tool
                this.drawTool = new esri.toolbars.Draw(this._unsafeMap);
                dojo.connect(this.drawTool, "onDrawComplete", $.proxy(this.addSketchToMap, this));
                this.layer = new esri.layers.GraphicsLayer();
                this.map.addLayer(this.layer);
            },
            
            renderLauncher: function renderLauncher() {
                // TODO: Provide as a template when arbitrary config linker
                // is available.
                return '<div class="measure"></div>';
            },

            activate: function () {
                this.drawTool.activate(esri.toolbars.Draw.POLYLINE);
                this.drawTool.finishDrawing();
            },

            deactivate: function() {
                this.drawTool.deactivate();
            },

            destroy: function () { },

            addSketchToMap: function (sketch) {
                this.deactivate();
                // Assume we only use a polyline for drawing
                var symbol = new esri.symbol.SimpleLineSymbol(
                    esri.symbol.SimpleLineSymbol.STYLE_DASH,
                    new dojo.Color([255, 0, 0]), 1);
                var graphic = new esri.Graphic(sketch.geometry, symbol);
                this.layer.add(graphic);
                console.log(esri.geometry.geodesicLengths([sketch.geographicGeometry], esri.Units.MILES));
            }

        });
    }
);