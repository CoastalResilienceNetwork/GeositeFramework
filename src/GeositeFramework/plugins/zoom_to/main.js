define(
    ["dojo/_base/declare", "./ui", "dojo/text!plugins/zoom_to/zoom_to.json", "esri/tasks/locator"],
    function (declare, ui, configString) {
        return declare(null, {
            toolbarName: "Zoom To",
            fullName: "Zoom to a specific address.",
            toolbarType: "map",

            initialize: function (args) {
                declare.safeMixin(this, args);
                this.config = JSON.parse(configString);
                this.input.setupLocator(this.config.locatorServiceUrl,
                                        this.map, this.config.defaultZoomLevel);
            },

            renderLauncher: function renderLauncher() {
                // TODO: Provide as a template when arbitrary config linker
                // is available.
                this.input = this.input || new ui.UiInput();
                this.inputView = this.inputView || new ui.UiInputView({ model: this.input });
                return this.inputView.render().$el;
            }

        });
    }
);
