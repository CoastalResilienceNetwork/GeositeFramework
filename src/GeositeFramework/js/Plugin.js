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

        /*
        Check that the plugin implements the minimal viable interface.
        Plugin code can just assume the plugin is valid if it has been loaded
        */
        function checkPluginCompliance(model) { 
            var pluginObject = model.get('pluginObject'),
                noOp = function noOp() { };

            // Ensure that the framework will not fail if a plugin
            // is missing an optional interface method
            _.each(['activate', 'deactivate', 'getState', 'destroy'], function (fn) {
                pluginObject[fn] = pluginObject[fn] || noOp;
            });
            
            return (_.isFunction(pluginObject.initialize));
        }

        // not currently used, not likely to still be
        // in this class when we implement the feature
        // TODO: remove
        function toggleUI(model) {
            model.set('showingUI', !model.get('showingUI'));
            model.toggleSelected();

            var pluginObject = model.get('pluginObject');
            if (model.selected) {    
                pluginObject.activate();
                model.set('active', true);
            } else {
                pluginObject.deactivate();
            }
        }

        N.models = N.models || {};
        N.models.Plugin = Backbone.Model.extend({
            defaults: {
                pluginObject: null,
                showingUI: false
            },
            toggleUI: function () { toggleUI(this); },

            initialize: function () { initialize(this); },

            isCompliant: function () { return checkPluginCompliance(this); },

            turnOff: function () {
                var pluginObject = this.get('pluginObject');
                pluginObject.destroy();
                this.set({
                    'showingUI': false,
                    'active': false
                });
                this.deselect();
            }

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

        N.views = N.views || {};
        N.views.BasePlugin = Backbone.View.extend({
            events: {
                'click': 'handleClick'
            },

            initialize: function () { initialize(this); },

            /*
                handleClick is exposed so that it can be overridden by
                extending classes, which should call the prototype to handle
                common plugin view click handling
            */
            handleClick: function handleClick() {
                var view = this;
                view.model.toggleUI();
            }
        });
    }());

    (function sidebarPlugin() {

        function render(view) {
            var model = view.model,
                toolbarName = model.get('pluginObject').toolbarName,
                pluginTemplate = N.app.templates['template-sidebar-plugin'],
                // The plugin icon looks active if the plugin is selected or
                // active (aka, running but not focused)
                html = pluginTemplate(_.extend(model.toJSON(), {
                    selected: model.selected || model.get('active')
                }));

            view.$el.empty().append(html);

            if (model.selected === true) {
                view.$el.addClass("selected-plugin");
                if (view.$displayContainer) { view.$displayContainer.show(); }
            } else {
                view.$el.removeClass("selected-plugin");
                if (view.$displayContainer) { view.$displayContainer.hide(); }
            }
            return view;
        }

        function attachContainer() {
            var view = this,
                calculatePosition = function ($el) {
                    var pos = view.$el.position(),
                        gutterWidth = 20,
                        yCenter = pos.top + $el.height() / 2,
                        xEdgeWithBuffer = pos.left + $el.width() + gutterWidth;

                    return {
                        top: yCenter,
                        left: xEdgeWithBuffer
                    }
                };

            // The sidebar plugin will attach the plugin display container
            // to the pane, from which it's visibility can be toggled on 
            // activation/deactivation
            view.$displayContainer = this.model.get('$displayContainer');

            view.$displayContainer
                // Position the dialog next to the sidebar button which shows it.
                .css(calculatePosition(this.$el))

                // Listen for events to turn the plug-in completely off
                .find('.plugin-off').on('click', function () {
                    view.model.turnOff()
                }).end()

                // Unselect the plugin, but keep active
                .find('.plugin-close').on('click', function () {
                    view.model.deselect();
                });

            view.$el.parents('.content').append(this.$displayContainer.hide());
        }

        N.views = N.views || {};
        N.views.SidebarPlugin = N.views.BasePlugin.extend({
            tagName: 'li',
            className: 'sidebar-plugin',
            $displayContainer: null,

            initialize: function sidebarPluginInit() {
                // Attach the plugin rendering container to the pane
                this.model.on('change:$displayContainer', attachContainer, this);

                N.views.BasePlugin.prototype.initialize.call(this);
            },

            render: function renderSidbarPlugin() { return render(this); }
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
