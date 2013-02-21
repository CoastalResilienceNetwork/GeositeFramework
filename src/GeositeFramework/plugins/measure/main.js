// Main module for GeositeFramework plugin "measure"

define(
    ["dojo/_base/declare"],
    function (declare) {
        return declare(null, {
            toolbarName: "Measure",
            fullName: "Measure distances and area on the map",
            toolbarType: "map",

            initialize: function (args) {
                declare.safeMixin(this, args);
            },

            renderLauncher: function renderLauncher() {
                // TODO: Provide as a template when arbitrary config linker
                // is available.
                return '<div class="measure"></div>';
            }

        });
    }
);