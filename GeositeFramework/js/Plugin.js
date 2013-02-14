/*jslint nomen:true, devel:true */
/*global Backbone, _, $, Geosite*/

// A plugin wraps around a plugin object and manages it in backbone

(function (N) {
    "use strict";
    (function () {

        function initialize(model) {
            var selectable = new Backbone.Picky.Selectable(model);
            _.extend(model, selectable);
        }

        // not currently used, not likely to still be
        // in this class when we implement the feature
        // TODO: remove
        function toggleUI(model) {
            model.set('showingUI', !model.get('showingUI'));
        }

        N.models = N.models || {};
        N.models.Plugin = Backbone.Model.extend({
            defaults: {
                pluginObject: null,
                showingUI: false
            },
            toggleUI: function () { toggleUI(this); },
            initialize: function () { initialize(this); }

        });

    }());

    (function () {

        function initialize(collection) {
            var singleSelect = new Backbone.Picky.SingleSelect(collection);
            _.extend(collection, singleSelect);
        }

        N.collections.Plugins = Backbone.Collection.extend({
            model: N.models.Plugin,

            initialize: function () { initialize(this); }
        });

    }());


    (function () {

        function initialize(view) {
            view.model.on("selected deselected", function () { view.render(); });
        }

        function handleClick(view) {
            view.model.toggleSelected();
        }

        function render(view) {
            var toolbarName = view.model.get('pluginObject').toolbarName,
                pluginTemplate = N.app.templates['template-sidebar-plugin'],
                html = pluginTemplate({ toolbarName: toolbarName });

            view.$el.empty();
            view.$el.append(html);

            // TODO: this code might grow.
            // If so, make it a method that
            // operates on the el/$el
            if (view.model.selected === true) {
                view.$el.addClass("selected-plugin");
            } else {
                view.$el.removeClass("selected-plugin");
            }
            return view;
        }

        N.views = N.views || {};
        N.views.Plugin = Backbone.View.extend({
            className: 'plugin',
            events: {
                'click': function () { handleClick(this); }
            },
            render: function () { return render(this); },
            initialize: function () { initialize(this); }
        });
    }());

}(Geosite));
