define(
    ["dojo/_base/declare"],
    function (declare) {
        return declare(null, {
            toolbarName: "Scenarios",
            fullName: "Try out different scenarios.",

            constructor: function (args) {
                declare.safeMixin(this, args);
            }
        });
    }
);