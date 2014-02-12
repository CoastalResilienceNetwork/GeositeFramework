define(["use!underscore", "./Comparer"],

    function(_, compare) {

        var FeatureComparer = function(options) {
            
            this.$templates = $('<div>').append($($.trim(options.templates)));
            this.comparer = new compare.Comparer(options.config, {
                map: options.context.map
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

        FeatureComparer.prototype._getTemplate = function(name) {
            var template = _.template($.trim(this.$templates.find('#' + name).html()));
            return template;
        };

        FeatureComparer.prototype.getState = function() {
            return this.comparer.getState();
        };

        FeatureComparer.prototype.setInitialState = function(state) {
            this.comparer.setInitialState(state);
        };

        return FeatureComparer;
    }    
)