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
            toggleUI: function () { toggleUI(this) }

        });

    }());

    (function () {

        function renderSelf(view) {
            var pluginTemplate = N.app.templates['template-sidebar-plugin'];
            var html = pluginTemplate({ toolbarName: view.model.get('pluginObject').toolbarName });
            view.$el.append(html);
            return view;
        }

        N.views = N.views || {};
        N.views.Plugin = Backbone.View.extend({
            className: 'plugin',
            events: {
                // currently just a proof of concept
                'click' : function () { alert("clicked!") }
            },
            render: function () { return renderSelf(this); }
        });
    }());

}(Geosite));
