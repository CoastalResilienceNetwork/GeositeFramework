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

        function initPluginObject(model, regionData, mapModel, esriMap) {
            var pluginObject = model.get('pluginObject'),
                pluginName = model.get('pluginSrcFolder'),
                $uiContainer = model.get('$uiContainer'),
                $legendContainer = model.get('$legendContainer');
            
            pluginObject.initialize({
                app: {
                    version: N.app.version,
                    regionConfig: regionData,
                    info: makeLogger(pluginName, "INFO"),
                    warn: makeLogger(pluginName, "WARN"),
                    error: makeLogger(pluginName, "ERROR"),
                    _unsafeMap: esriMap
                },
                map: N.createMapWrapper(esriMap, mapModel, pluginObject),
                container: ($uiContainer ? $uiContainer.find('.plugin-container-inner')[0] : undefined),
                legendContainer: ($legendContainer ? $legendContainer[0] : undefined),
                forceDeactivate: function () {
                    // Drop the turnOff call to the end of the stack because
                    // if the plugin called this from it's initialize event, the
                    // selection change events from backbone.picky will still 
                    // fire the unchanged selection model state, resulting in an
                    // infinite loop.
                    setTimeout(function () { model.turnOff(); }, 0);
                }
            });
        }

        function setState(model, pluginState) {
            var pluginObject = model.get('pluginObject');

            if (pluginState !== "" && pluginObject.setState) {
                model.set('active', true);
                pluginObject.setState(pluginState);
            }
        }

        function getState(model) {
            var pluginObject = model.get('pluginObject');

            if (model.get('active') === true) {
                return pluginObject.getState();
            } else {
                return null;
            }
        }

        function name(model) {
            // A public method for getting the name of the current plugin
            return model.get('pluginSrcFolder');
        }

        function makeLogger(pluginName, level) {
            return function (userMessage, developerMessage) {
                if (developerMessage) {
                    // Log to server-side plugin-specific log file
                    Azavea.logMessage(developerMessage, pluginName, level);
                    if (level === "ERROR") {
                        // Errors also get logged to server-side main log file
                        Azavea.logError("Error in plugin '" + pluginName + "': " + developerMessage);
                    }
                }
                if (userMessage) {
                    // TODO: create a panel
                    alert(userMessage);
                }
            };
        }

        /*
        Check that the plugin implements the minimal viable interface.
        Plugin code can just assume the plugin is valid if it has been loaded
        */
        function checkPluginCompliance(model) { 
            var pluginObject = model.get('pluginObject');
            return (_.isFunction(pluginObject.initialize));
        }

        // The UI state of a plugin is represented by two booleans, "selected" and "active".
        //   * Only one plugin can be "selected" -- showing its UI, and interpreting mouse events.
        //     (This is implemented via a Backbone.Picky SingleSelect collection.)
        //   * Several plugins may be "active" -- toolbar icon highlighted, and possibly showing map layers.
        //     (This is represented by the plugin model's "active" attribute)
        // 
        // Note that our JavaScript plugin object method names don't match this terminology -- specifically,
        // when a plugin is deselected it remains "active" in the UI sense, but we call the plugin deactivate()
        // method.

        N.models = N.models || {};
        N.models.Plugin = Backbone.Model.extend({
            defaults: {
                pluginObject: null,
                active: false
            },
            initialize: function () { initialize(this); },

            isCompliant: function () { return checkPluginCompliance(this); },

            initPluginObject: function (regionData, mapModel, esriMap) { initPluginObject(this, regionData, mapModel, esriMap); },

            setState: function (pluginState) { setState(this, pluginState); },

            getState: function () { return getState(this); },

            name: function () { return name(this); },

            onSelectedChanged: function () {
                if (this.selected) {
                    this.set('active', true);
                    this.get('pluginObject').activate();
                } else {
                    this.get('pluginObject').deactivate();
                }
            },

            turnOff: function () {
                this.deselect();
                this.set('active', false);
                this.get('pluginObject').hibernate();
            },

            identify: function (mapPoint, clickPoint, processResults) {
                var active = this.get('active'),
                    pluginObject = this.get('pluginObject'),
                    pluginTitle = pluginObject.toolbarName;
                if (active) {
                    // This plugin might have some results, so give it a chance to identify()
                    pluginObject.identify(mapPoint, clickPoint, function (results, width, height) {
                        processResults(pluginTitle, results, width, height);
                    });
                } else {
                    // This plugin has no results
                    processResults(pluginTitle, false);
                }
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
            var model = view.model;
            view.render();
            model.on('selected deselected', function () {
                view.render();
                model.onSelectedChanged();
            });
            model.on('change:active', function () {
                view.render();
            });
        }

        N.views = N.views || {};
        N.views.BasePlugin = Backbone.View.extend({
            // If your plugin happens to have clickable elements
            // inside of the 'a' tag of the button container, 
            // you should reduce the scope of this target by
            // doing a .stopPropagation() on your element.
            // A better solution would be to not include clickable
            // elements in the <a> tag that your plugin renders
            // into. Make your UI separate from the button that
            // launches it.
            events: {
                'click a.plugin-launcher': 'handleLaunch',
                'click a.plugin-clear': 'handleClear'
            },

            initialize: function () { initialize(this); },

            /*
                Click handlers exposed so that they can be overridden by
                extending classes, which should call the prototype to handle
                common plugin view click handling
            */
            handleLaunch: function handleLaunch() {
                this.model.toggleSelected();
            },

            // The base class is a no-op for now, but the function must be declared.
            // Implementing classes will override this event
            handleClear: function handleClear() {}
            
        });
    }());

    (function sidebarPlugin() {

        function initialize(view, $parent) {
            render(view);
            view.$el.appendTo($parent);
            createUiContainer(view);
            createLegendContainer(view);
            N.views.BasePlugin.prototype.initialize.call(view);
        }

        function render(view) {
            var model = view.model,
                pluginTemplate = N.app.templates['template-sidebar-plugin'],
                // The plugin icon looks active if the plugin is selected or
                // active (aka, running but not focused)
                html = pluginTemplate(_.extend(model.toJSON(), {
                    selected: model.selected || model.get('active'),
                    fullName: model.get('pluginObject').fullName
                }));

            view.$el.empty().append(html);

            if (view.model.selected === true) {
                view.$el.addClass("selected-plugin");
                if (view.$uiContainer) {
                    view.$uiContainer.show();
                }
            } else {
                view.$el.removeClass("selected-plugin");
                if (view.$uiContainer) {
                    view.$uiContainer.hide();
                }
            }
            if (view.$legendContainer) {
                if (view.model.get('active')) {
                    view.$legendContainer.show();
                } else {
                    view.$legendContainer.hide();
                }
            }
            return view;
        }

        function createUiContainer(view) {
            var bindings = { title: view.model.get("pluginObject").toolbarName },
                $uiContainer = $($.trim(N.app.templates['template-plugin-container'](bindings))),

                calculatePosition = function ($el) {
                    var pos = view.$el.position(),
                        gutterWidth = 70,
                        gutterHeight = -20,
                        yCenter = $el.height() / 2 + gutterHeight,
                        xEdgeWithBuffer = pos.left + $el.width() + gutterWidth;

                    return {
                        top: yCenter,
                        left: xEdgeWithBuffer
                    };
                };

                $uiContainer = $($.trim(N.app.templates['template-plugin-container'](bindings)));

            $uiContainer
                // Position the dialog next to the sidebar button which shows it.
                .css(calculatePosition(view.$el))
            
                // Listen for events to turn the plugin completely off
                .find('.plugin-off').on('click', function () {
                    view.model.turnOff();
                }).end()

                // Unselect the plugin, but keep active
                .find('.plugin-close').on('click', function () {
                    view.model.deselect();
                });

            // Attach to top pane element
            view.$el.parents('.content').append($uiContainer.hide());

            // Tell the model about $uiContainer so it can pass it to the plugin object
            view.model.set('$uiContainer', $uiContainer);
            view.$uiContainer = $uiContainer;
        }

        function createLegendContainer(view) {
            // Create container for custom legend and attach to legend element
            var $legendContainer = $('<div>').hide()
                .appendTo(view.$el.parents('.content').find('.legend'));

            // Tell the model about $legendContainer so it can pass it to the plugin object
            view.model.set('$legendContainer', $legendContainer);
            view.$legendContainer = $legendContainer;
        }

        N.views = N.views || {};
        N.views.SidebarPlugin = N.views.BasePlugin.extend({
            tagName: 'li',
            className: 'sidebar-plugin',
            $uiContainer: null,
            $legendContainer: null,

            initialize: function () { initialize(this, this.options.$parent); },

            render: function renderSidbarPlugin() { return render(this); }
        });
    }());

    (function topbarPluginView() {
        
        function render() {
            // Topbar plugins don't render into any predefined context,
            // simply provide a div, render a template containg an anchor
            // tag into this div, and let the plugin implement its
            // launcher layout

            var view = this,
                pluginObject = this.model.get('pluginObject'),
                pluginTemplate = N.app.templates['template-topbar-plugin'],
                toolsMarkup = N.app.templates['template-topbar-tools'](),
                $container = $($.trim(pluginTemplate(pluginObject)));

            this.$el.toggleClass('active', this.model.get('active'));

            if (pluginObject.renderLauncher
                    && _.isFunction(pluginObject.renderLauncher)) {
                view.$el
                    .empty()
                    .append($container.append(pluginObject.renderLauncher()))
                    .append(toolsMarkup);
            }

            return view;
        }

        N.views = N.views || {};
        N.views.TopbarPlugin = N.views.BasePlugin.extend({
            className: 'topbar-plugin',
            render: render,
            handleClear: function () {
                this.model.turnOff();
            }
        });
    }());
}(Geosite));
