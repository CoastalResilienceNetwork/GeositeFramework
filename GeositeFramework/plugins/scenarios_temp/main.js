define(
    ["dojo/_base/declare"],
    function (declare) {
        return declare(null, {
            toolbarName: "Scenarios",
            fullName: "Try out different scenarios.",
            toolbarType: "sidebar",
            initialize: function (args) {
                declare.safeMixin(this, args);
            }
        });
    }
);