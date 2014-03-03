define(["dojo/json", "use!tv4", "dojo/text!./comparerSchema.json", "use!underscore", "./Comparer"],

    function(JSON, tv4, comparerSchema, _, compare) {

        var FeatureComparer = function(options) {
            this.app = options.context.app;
            this.config = this._parseConfig(tv4, options.config, comparerSchema);
            if (!this.config) { return; }

            this.$templates = $('<div>').append($($.trim(options.templates)));
            this.comparer = new compare.Comparer(this.config, {
                map: options.context.map,
                app: this.app
            });

            this.comparerView = new compare.ComparerView({
                model: this.comparer,
                el: options.context.container,
                templates: {
                    body: this._getTemplate('template-comparer-pluginbody'),
                    featureValue: this._getTemplate('template-comparer-feature-value'),
                    featureFields: this._getTemplate('template-comparer-featurefields'),
                    feature: this._getTemplate('template-comparer-feature') 
                }
            });
        };

        FeatureComparer.prototype.activate = function() {
            this.comparer.activate();
        };

        FeatureComparer.prototype.close = function() {
            this.comparer.close();
            this.comparerView.cleanUp();
        };

        FeatureComparer.prototype.hide = function() {
            this.comparer.hide();
        };

        FeatureComparer.prototype.getState = function() {
            return this.comparer.getState();
        };

        FeatureComparer.prototype.setInitialState = function(state) {
            this.comparer.setInitialState(state);
        };

        FeatureComparer.prototype._getTemplate = function(name) {
            var template = _.template($.trim(this.$templates.find('#' + name).html()));
            return template;
        };

        FeatureComparer.prototype._parseConfig = function(validator, config, schema) {
            /* Validate the user configured options against the plugin schema */
            var errorMessage;
            try {
                if (validator.validate(config, schema)) {
                    return config;
                }
                errorMessage = tv4.error.message + " (data path:in " + tv4.error.dataPath + ")";

            } catch(ex) {
                errorMessage = ex.message;
            }
            this.app.error("", "Error in Feature Compare plugin config: " +
                errorMessage);

            return null;
        };

        return FeatureComparer;
    }    
)