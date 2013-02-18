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
            model.toggleSelected();
            if (model.selected) {
                var pluginObject = model.get('pluginObject');
                if (_.isFunction(pluginObject.activate)) {
                    pluginObject.activate();
                }
            }
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


    (function basePluginView() {

        function initialize(view) {
            view.model.on("selected deselected", function () { view.render(); });
        }

        function handleClick(view) {
            view.model.toggleUI();
        }

        N.views = N.views || {};
        N.views.BasePlugin = Backbone.View.extend({
            events: {
                'click': function () { handleClick(this); }
            },
            initialize: function () { initialize(this); }
        });
    }());

    (function sidebarPlugin() {

        function render(view) {
            var toolbarName = view.model.get('pluginObject').toolbarName,
                pluginFolder = view.model.get('pluginSrcFolder'),
                pluginTemplate = N.app.templates['template-sidebar-plugin'],
                html = pluginTemplate({
                    toolbarName: toolbarName,
                    pluginSrcFolder: pluginFolder
                });

            view.$el.empty().append(html);

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
        N.views.SidebarPlugin = N.views.BasePlugin.extend({
            tagName: 'li',
            className: 'sidebar-plugin',
            render: function () { return render(this); },
        });
    }());

    (function topbarPluginView() {

        function render() {
            // Topbar plugins don't render into any predefined context,
            // simply provide a div and let the plugin implement it's 
            // launcher layout
            var view = this,
                pluginObject = this.model.get('pluginObject');

            if (pluginObject.renderLauncher
                    && _.isFunction(pluginObject.renderLauncher)) {
                view.$el.html(pluginObject.renderLauncher());
            }

            return view;
        }

        N.views = N.views || {};
        N.views.TopbarPlugin = N.views.BasePlugin.extend({
            className: 'topbar-plugin',
            render: render
        });
    }());
}(Geosite));
