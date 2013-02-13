define(
    ["dojo/_base/declare", "./agsLoader", "./ui"], 
    function (declare, agsLoader, ui) {

        return declare(null, {
            toolbarName: "Map Layers",
            fullName: "Configure and control layers to be overlayed on the base map.",

            _layerTree: null,

            constructor: function (args) {
                declare.safeMixin(this, args);

                var baseUrl = 'http://dev.gulfmex.coastalresilience.org/arcgis/rest/services';
                this._layerTree = { expanded: true, children: [] };
                agsLoader.load(baseUrl, this._layerTree);
            },

            activate: function () {
                ui.render(this._layerTree);
            }

        });
    }
);