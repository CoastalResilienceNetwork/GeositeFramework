define(
    ["dojo/_base/declare", "./AgsLoader", "./Ui"], 
    function (declare, AgsLoader, Ui) {

        function loadConfig(self)
        {
            return $.ajax({
                dataType: 'json',
                contentType: "application/json",
                url: 'plugins/layer_selector/layers.json',
                success: function (layerData) { loadLayerData(self, layerData); },
                error: handleAjaxError
            });
        }

        function loadLayerData(self, layerData) {
            self._layerTree = { expanded: true, children: [] };
            if (layerData.agsSources !== undefined) {
                _.each(layerData.agsSources, function (baseUrl) {
                    self._agsLoader = new AgsLoader(baseUrl);
                    self._agsLoader.load(self._layerTree);
                });
            }
        }

        function handleAjaxError(jqXHR, textStatus, errorThrown) {
            // TODO: do something better
            alert('AJAX error: ' + errorThrown);
        }

        return declare(null, {
            toolbarName: "Map Layers",
            fullName: "Configure and control layers to be overlayed on the base map.",
            toolbarType: "sidebar",

            _layerTree: null,
            _agsLoader: null,

            initialize: function (args) {
                declare.safeMixin(this, args);
                loadConfig(this);
            },

            activate: function () {
                if (this._agsLoader.isLoaded()) {
                    var ui = new Ui(this.map);
                    ui.render(this._layerTree, this.container);
                } else {
                    // TODO: something better
                    alert("Layers have not finished loading, please try again soon");
                }
            }

        });
    }
);