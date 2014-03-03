define(["use!underscore", "./ValueFormatter"], function(_, Formatter) {
    var Feature = Backbone.Model.extend({
        graphic: null // The map graphic representing this feature
    });

    var FeatureView = Backbone.View.extend({
        initialize: function(options) {
            this.options = options;
            this.render();
        },

        render: function() {
            var view = this,
                html = _.map(view.options.orderedFieldInfos, function(field) {
                    var formattedVal = view._formatValue(field.name); 
                    return view.options.valueTemplate({
                        value: formattedVal.value || formattedVal.origValue,
                        rawValue: formattedVal.origValue
                    });
                }),
                $list = view.$('ul');

            // Feature attribute values            
            $list.append.apply($list, html);

            // Selection badge color
            var color = new dojo.Color(view.model.get('selectionColor'));
            view.$('.comparer-selection-badge').css('background-color', color.toHex());

        },

        _formatValue:  function (fieldName) {
            var model = this.model,
                fieldOptions = _.findWhere(model.get('fieldInfos'), { name: fieldName }),
                rawValue = model.get(fieldName),
                format = new Formatter(fieldOptions).render(rawValue);

            if (!format.valid) {
                this.options.error(fieldName, format.msg);
            }

            // A problem with the config will log the error, but still show the raw value
            return format;
        }
    });

    return {
        Feature: Feature,
        FeatureView: FeatureView
    };
});