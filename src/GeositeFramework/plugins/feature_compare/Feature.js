define(["use!underscore"], function(_) {
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
                    return view.options.valueTemplate({
                        value: view.model.get(field.name)
                    });
                }),
                $list = view.$('ul');

            // Feature attribute values            
            $list.append.apply($list, html);

            // Selection badge color
            var color = new dojo.Color(view.model.get('selectionColor'));
            view.$('.comparer-selection-badge').css('background-color', color.toHex());

        }
    });

    return {
        Feature: Feature,
        FeatureView: FeatureView
    };
});