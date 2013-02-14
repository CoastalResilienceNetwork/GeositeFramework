define(
    ["dojo/_base/declare", "./AgsLoader", "./ui"], 
    function (declare, AgsLoader, ui) {

        return declare(null, {
            toolbarName: "Map Layers",
            fullName: "Configure and control layers to be overlayed on the base map.",

            _layerTree: null,
            _agsLoader: null,

            initialize: function (args) {
                declare.safeMixin(this, args);

                var baseUrl = 'http://dev.gulfmex.coastalresilience.org/arcgis/rest/services';
                this._layerTree = { expanded: true, children: [] };
                this._agsLoader = new AgsLoader(baseUrl).load(this._layerTree);
            },

            activate: function () {
                if (this._agsLoader.isLoaded()) {
                    ui.render(this._layerTree, this.container);
                } else {
                    // TODO: something better
                    alert("Layers have not finished loading, please try again soon");
                }
            }

        });
    }
);