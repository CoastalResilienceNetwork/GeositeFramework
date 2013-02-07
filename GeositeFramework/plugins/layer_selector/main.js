define(
    ["dojo/_base/declare"],
    function (declare) {
        return declare(null, {
            toolbarName: "Map Layers",
            fullName: "Configure and control layers to be overlayed on the base map.",

            constructor: function (args) {
                declare.safeMixin(this, args);
            }
        });
    }
);