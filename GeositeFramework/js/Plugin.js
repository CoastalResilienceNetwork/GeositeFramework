/*jslint nomen:true, devel:true */
/*global Backbone, _, $, Geosite*/

// A plugin wraps around a plugin object and manages it in backbone

(function (N) {
    "use strict";
    (function () {

        // this functionality might get swallowed up
        // by the Pane model. not yet sure which will
        // be responsible for tracking who is currently
        // active.
        function toggleActive(model) {
            if (model.get('currentlyActive')) {
                model.set({ currentlyActive: false });
                model.set({ showingUI: false });
            } else {
                model.set({ currentlyActive: true });
            }
        }

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
                currentlyActive: false,
                showingUI: false
            },
            toggleActive: function () { toggleActive(this) },
            toggleUI: function () { toggleUI(this) },
            initialize: function () { initialize(this) }

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
            view.model.on("selected deselected", function () { view.render() });
            //view.model.on("change:test", function () { alert("modelchange"); });
            //view.model.on("deselect", view.render, view);
        }
            

        function renderSelf(view) {
            view.$el.empty();
            var pluginTemplate = N.app.templates['template-sidebar-plugin'];
            var html = pluginTemplate({ toolbarName: view.model.get('pluginObject').toolbarName });
            view.$el.append(html);
            if (view.model.selected == true) {
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
                // currently just a proof of concept
                'click': function () {
                    //alert("click");
                    //alert(this.model.selected);
                    this.model.toggleSelected();
                    //alert(this.model.selected);
                    //this.model.set({ test: "test" });
                }
            },
            render: function () { return renderSelf(this); },
            initialize: function () { initialize(this); }
        });
    }());

}(Geosite));
