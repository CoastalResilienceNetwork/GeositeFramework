require({
    packages: [
        {
            name: "underscore",
            location: "//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3",
            main: "underscore-min"
        }
    ]
});

define([
        "dojo/_base/declare",
        "dojo/json",
        "use!tv4",
        "./schema",
        "dojo/text!./layers.json",
        "underscore"
    ],
    function (declare, JSON, tv4, layerConfigSchema, layerSourcesJson, _) {

        return declare(null, {
            constructor: function () {
                this.layers = this.parse(layerSourcesJson);
            },

            parse: function(json) {
                var errorMessage;
                try {
                    var data = JSON.parse(json),
                        valid = tv4.validate(data, layerConfigSchema);
                    if (valid) {
                        return data;
                    } else {
                        errorMessage = tv4.error.message + " (data path: " + tv4.error.dataPath + ")";
                    }
                } catch (e) {
                    errorMessage = e.message;
                }
                console.error(errorMessage);
                return null;
            },

            getLayers: function() {
                return this.layers;
            }
        });
    }
);