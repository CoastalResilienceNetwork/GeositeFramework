// PluginBase.js -- superclass for plugin modules

define(["dojo/_base/declare"],
    function (declare) {
        return declare(null, {
            toolbarName: "",
            fullName: "",
            toolbarType: "sidebar",
            showServiceLayersInLegend: true,
            allowIdentifyWhenActive: false,

            activate: function () {},
            deactivate: function () {},
            hibernate: function () {},
            getState: function () {}
        });
    }
);