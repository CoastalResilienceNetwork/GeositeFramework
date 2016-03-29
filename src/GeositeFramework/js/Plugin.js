/*jslint nomen:true, devel:true */
/*global Backbone, _, $ */

// A plugin wraps around a plugin object and manages it in backbone

require(['use!Geosite',
         'esri/map',
         'esri/layers/ArcGISDynamicMapServiceLayer',
         'framework/Logger',
         'dojo/dom-style',
         'framework/widgets/ConstrainedMoveable',
         'dojox/layout/ResizeHandle',
         'dijit/form/CheckBox',
         'dijit/form/Button'
        ],
    function(N,
             Map,
             ArcGISDynamicMapServiceLayer,
             Logger,
             domStyle,
             ConstrainedMoveable,
             ResizeHandle,
             CheckBox,
             Button) {
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
                $legendContainer = model.get('$legendContainer'),
                logger = new Logger(pluginName);

            try {
                pluginObject.initialize({
                    app: {
                        version: N.app.version,
                        regionConfig: regionData,
                        paneNumber: mapModel.get('mapNumber'),
                        info: _.bind(logger.info, logger),
                        warn: _.bind(logger.warn, logger),
                        error: _.bind(logger.error, logger),
                        _unsafeMap: esriMap,
                        downloadAsCsv: requestCsvDownload,
                        downloadAsPlainText: requestTextDownload,
                        dispatcher: N.app.dispatcher
                    },
                    map: N.createMapWrapper(esriMap, mapModel, pluginObject),
                    container: ($uiContainer ? $uiContainer.find('.plugin-container-inner')[0] : undefined),
                    legendContainer: ($legendContainer ? $legendContainer[0] : undefined),
                    printButton: ($uiContainer ? $uiContainer.find('.plugin-print') : undefined)
                });
            } catch (e) {
                // Prevent the malfunctioning plugin from stopping the rest of the code execution
                console.error(e.stack);
                console.error(e);
            }
        }

        function requestCsvDownload(filename, content) {
            requestDownload(filename, content, 'download/csv');
        }

        function requestTextDownload(filename, content) {
            requestDownload(filename, content, 'download/text');
        }

        function requestDownload(filename, content, action) {
            $('#download-csv-form')
                .attr('action', action)
                .find('input[name=content]').val(JSON.stringify(content)).end()
                .find('input[name=filename]').val(filename).end()
                .submit();
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
                active: false,
                displayHelp: false
            },
            initialize: function () { initialize(this); },

            isCompliant: function () { return checkPluginCompliance(this); },

            initPluginObject: function (regionData, mapModel, esriMap) { initPluginObject(this, regionData, mapModel, esriMap); },

            setState: function (pluginState) { setState(this, pluginState); },

            getState: function () { return getState(this); },

            name: function () { return name(this); },

            getId: function() {
                return _.last(name(this).split('/'));
            },

            onSelectedChanged: function () {
                if (this.selected) {
                    var active = this.get('active')
                    if (!active && this.getShowHelpOnStartup()) {
                        this.set('displayHelp', true);
                    }

                    this.set('active', true);
                    this.get('pluginObject').activate();
                } else {
                    this.get('pluginObject').deactivate();
                    this.trigger('plugin:deselected');
                }
            },

            turnOff: function (callback) {
                var self = this,
                    initiallySelected = this.selected,
                    // Clean up event listeners and execute the callback,
                    // we are done here.
                    cleanUp = function () {
                        self.off('plugin:deselected');
                        if (_.isFunction(callback)) {
                            callback();
                        }
                    },

                    // Deselect the plugin.  This is an async trigger operation
                    // within backbone.picky.  It will cause plugin:deselected
                    // to fire.
                    doDeselect = function() {
                        if (self.selected) {
                            self.deselect();
                        }
                    },

                    // Make this plugin no longer active, and inform it of its
                    // new status via the hibernate function
                    doDeactivate = function() {
                        self.set('active', false);
                        self.get('pluginObject').hibernate();
                    }

                // If the plugin was not being turned off while selected
                // finish immediately and callback.  Otherwise, wait until
                // we know that the plugin has finished its deactivation routine
                // and then execute callback
                if (!initiallySelected) {
                    doDeselect();
                    doDeactivate();
                    cleanUp();
                } else {
                    // When the plugin has fully be deselected, deactivate it
                    // and stop listening for the event - execute the provided
                    // callback that the async job is done
                    this.on('plugin:deselected', function() {
                        doDeactivate();
                        cleanUp();
                    });

                    doDeselect();
                }
            },


            identify: function (mapPoint, clickPoint, processResults) {
                var active = this.get('active'),
                    pluginObject = this.get('pluginObject'),
                    pluginTitle = pluginObject.toolbarName;
                if (active) {
                    // This plugin might have some results, so give it a chance to identify()
                    pluginObject.identify(mapPoint, clickPoint, function (results, width, height) {
                        processResults({ pluginTitle: pluginTitle,
                                         result: results,
                                         width: width,
                                         height: height });
                    });
                } else {
                    // This plugin has no results
                    processResults({ pluginTitle: pluginTitle,
                                     result: false });
                }
            },

            getShowHelpOnStartup: function() {
                var pluginObject = this.get('pluginObject'),
                    showValueKey = pluginObject.toolbarName + " showinfographic";
                if (typeof localStorage[showValueKey] !== 'undefined') {
                    return localStorage[showValueKey] === 'true';
                }
                return true;
            },

            setShowHelpOnStartup: function(val) {
                var pluginObject = this.get('pluginObject'),
                    showValueKey = pluginObject.toolbarName + " showinfographic";
                localStorage.setItem(showValueKey, val);
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

            createLegendContainer(view);
        }

        function createLegendContainer(view) {
            // Create container for custom legend and attach to legend element
            var $legendContainer = $('<div>', {'class': 'custom-legend'}).hide()
                .appendTo(view.$el.parents('.content').find('.legend .legend-body .plugin-legends'));

            // Tell the model about $legendContainer so it can pass it to the plugin object
            view.model.set('$legendContainer', $legendContainer);
            view.$legendContainer = $legendContainer;
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

        function initialize(view, $parent, paneNumber) {
            var model = view.model,
                pluginObject = model.get('pluginObject');
            view.paneNumber = paneNumber;
            render(view);
            view.$el.appendTo($parent);
            createUiContainer(view, paneNumber);
            createHelpScreen(view);
            setWidth(view, pluginObject.width);
            setHeight(view, pluginObject.height);
            view.listenTo(model, 'change:displayHelp', onDisplayHelpChanged);
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
            view.$el.addClass(model.getId() + '-' + view.paneNumber);

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

            if ($.i18n) {
                $(view.$uiContainer).localize();
                $(view.$el).localize();
            }

            return view;
        }

        function getContainerId(view) {
            return view.model.name() + '-' + view.paneNumber;
        }

        function createUiContainer(view, paneNumber) {
            var model = view.model,
                pluginObject = model.get('pluginObject'),
                containerId = getContainerId(view),
                bindings = {
                    title: pluginObject.toolbarName,
                    id: containerId,
                    isHelpButtonVisible: isHelpButtonVisible(view),
                    hasCustomPrint: pluginObject.hasCustomPrint
                },
                $uiContainer = $($.trim(N.app.templates['template-plugin-container'](bindings))),
                calculatePosition = function ($el) {
                    return {
                        top: 64,
                        left: 70
                    };
                };

            view.$uiContainer = $uiContainer;

            $uiContainer
                // Position the dialog
                .css(calculatePosition(view.$el))
                // Listen for events to turn the plugin completely off
                .find('.plugin-off').on('click', function () {
                    model.turnOff();
                }).end()
                // Unselect the plugin, but keep active
                .find('.plugin-close').on('click', function () {
                    model.deselect();
                }).end()
                .find('.plugin-help').on('click', function () {
                    model.set('displayHelp', true);
                }).end()
                .find('.plugin-print').on('click', function() {
                    var pluginDeferred = $.Deferred(),
                        parseDeferred = $.Deferred(),
                        previewDeferred = $.Deferred(),
                        pluginCssPath = model.get('pluginSrcFolder') + '/print.css',
                        printCssClass = 'plugin-print-css',
                        oppositePaneHideCssPath = 'css/print-hide-map' +
                            (paneNumber === 0 ? 1 : 0) + '.css',
                        $printSandbox = $('#plugin-print-sandbox');

                    // Any previous plugin-prints may have left specific print css
                    // or sandbox elements.  Clear all so that this new print routine
                    // has no conflicts with other plugins.
                    $('.' + printCssClass).remove();
                    $printSandbox.empty();

                    // Add the plugin css
                    addCss(pluginCssPath, printCssClass);

                    // Hide the possible same plugin from the opposite map pane
                    addCss(oppositePaneHideCssPath, printCssClass);

                    // Give some time for the browser to parse the new CSS,
                    // if this wasn't slightly delayed, occasionally the override would
                    // not be present and print features wouldn't show up.
                    _.delay(parseDeferred.resolve, 200);

                    var mapReadyDeferred = setupPrintableMap(pluginObject, $printSandbox, previewDeferred);

                    mapReadyDeferred.then(function(previewMap) {
                        // The plugin is given a deferred object to resolve when the page is ready
                        // to be printed, a reference to an element where it can place printable
                        // elements outside of its container and a reference to an esriMap which
                        // is used as a print preview box.
                        pluginObject.beforePrint(pluginDeferred, $printSandbox, previewMap);

                        // Exectue the browser print when the plugin and print preview (if used)
                        // have responded, as well as a slight delay for css parsing.
                        $.when(pluginDeferred, parseDeferred, previewDeferred).then(function() {
                            window.print();
                        });
                    });
                }).end()
                .hide();

            // Attach to top pane element
            view.$el.parents('.content').find('.map-outer > .map').append($uiContainer);

            setResizable(view, pluginObject.resizable);

            new ConstrainedMoveable($uiContainer[0], {
                handle: $uiContainer.find('.plugin-container-header')[0],
                within: true
            });

            // Tell the model about $uiContainer so it can pass it to the plugin object
            model.set('$uiContainer', $uiContainer);
        }

        function setupPrintableMap(pluginObject, $printSandbox, previewDeferred) {
            var mapMarkup = N.app.templates['template-map-preview']({ pluginName: pluginObject.toolbarName }),
                $mapPrint = $($.trim(mapMarkup)),
                $printPreview = $('#print-preview-sandbox'),
                mapReadyDeferred = $.Deferred(),
                mapHeight = pluginObject.previewMapSize[1],
                mapWidth = pluginObject.previewMapSize[0];

            // If the plugin is not set up for map print preview, don't set up a map
            // and resolve any pending print-preview map operations
            if (!pluginObject.usePrintPreviewMap) {
                previewDeferred.resolve();
                mapReadyDeferred.resolve();
                return mapReadyDeferred;
            }

            // Setup a print-preview window for the user to select an extent and zoom level
            // that will be persisted at print due to its fixed size.
            TINY.box.show({
                animate: false,
                html: $mapPrint[0].outerHTML,
                boxid: 'print-preview-container',
                width: _.max([mapWidth, 500]),
                fixed: true,
                maskopacity: 40,
                openjs: function () {
                    // Remove any calculated size so that it contains the full map
                    $('#print-preview-container').css({ height: 'initial', width: 'initial' });

                    // Set the supplied height & width on the map
                    $('#plugin-print-preview-map').css({ height: mapHeight, width: mapWidth });

                    var originalMap = pluginObject.app._unsafeMap,
                        map = new Map('plugin-print-preview-map', { extent: originalMap.extent }),
                        currentBaseMapUrl = originalMap.getLayer(originalMap.layerIds[0]).url;

                    map.addLayer(new ArcGISDynamicMapServiceLayer(currentBaseMapUrl));

                    dojo.connect(map, 'onLoad', function() {
                        mapReadyDeferred.resolve(map);
                    });

                    $('#print-preview-print').on('click', function() {
                        // Move the map from the plugin print preview dialog to the sandbox where
                        // the plugin can mess with it's positioning among its other elements
                        $(map.container).detach().appendTo($printSandbox);
                        TINY.box.hide();
                        $printPreview.hide();
                        previewDeferred.resolve();
                    });
                }
            });

            return mapReadyDeferred;
        }

        function addCss(path, className) {
            $('<link>', {
                rel: 'stylesheet',
                href: path,
                'class': className
            }).appendTo('head');
        }

        function onContainerResize(view, resizeHandle, event) {
            var dx = event.x - resizeHandle.startPoint.x,
                dy = event.y - resizeHandle.startPoint.y;
            view.model.get("pluginObject").resize(dx, dy);
        }

        function createHelpScreen(view) {
            var model = view.model,
                pluginObject = model.get('pluginObject'),
                pluginContainer = view.$uiContainer.find('.plugin-container');

            if (pluginObject.infoGraphic) {
                view.helpScreen = new N.views.InfoGraphicView({
                    model: model
                });
                pluginContainer.append(view.helpScreen.el);
                view.helpScreen.$el.hide();
            }
        }

        function isHelpButtonVisible(view) {
            var model = view.model,
                pluginObject = model.get('pluginObject');
            return typeof pluginObject.infoGraphic !== 'undefined';
        }

        function onDisplayHelpChanged() {
            var view = this,
                model = view.model,
                pluginObject = model.get('pluginObject'),
                $uiContainer = view.$uiContainer,
                $mainPanel = $uiContainer.find('.plugin-container-inner'),
                showInfoGraphic = !!model.get('displayHelp');

            if (!view.helpScreen) {
                return;
            }

            if (showInfoGraphic) {
                view.helpScreen.$el.show();
                $mainPanel.hide();
            } else {
                view.helpScreen.$el.hide();
                $mainPanel.show();
            }

            // Disable resizing when infographic is active
            setResizable(this, pluginObject.resizable && !showInfoGraphic);

            // Expand plugin panel to fit content when infographic is active
            if (showInfoGraphic) {
                setWidth(this, null);
                setHeight(this, null);
            } else {
                setWidth(this, pluginObject.width);
                setHeight(this, pluginObject.height);
            }

            var primaryContainerVisible = !showInfoGraphic;
            pluginObject.onContainerVisibilityChanged(primaryContainerVisible);
        }

        // Draw resize handle if resizable, destroy it if not resizable.
        function setResizable(view, resizable) {
            var handle = view.resizeHandle,
                handleExists = typeof handle !== 'undefined' && handle != null,
                containerId = getContainerId(view);
            if (resizable && !handleExists) {
                // Make the container resizable and moveable
                handle = new ResizeHandle({
                    targetId: containerId,
                    activeResize: true,
                    animateSizing: false
                });
                handle.placeAt(containerId)
                handle.on('resize', function (e) { onContainerResize(view, this, e); });
                view.resizeHandle = handle;
            } else if (!resizable && handleExists) {
                handle.destroy();
                view.resizeHandle = null;
            }
            view.$uiContainer.toggleClass('resizable', resizable);
        }

        function setWidth(view, width) {
            var $uiContainer = view.$uiContainer[0];
            domStyle.set($uiContainer, 'width', width == null ? 'auto' : width + 'px');
        }

        function setHeight(view, height) {
            var $uiContainer = view.$uiContainer[0];
            domStyle.set($uiContainer, 'height', height == null ? 'auto' : height + 'px');
        }

        N.views = N.views || {};
        N.views.SidebarPlugin = N.views.BasePlugin.extend({
            tagName: 'li',
            className: 'sidebar-plugin',
            $uiContainer: null,
            $legendContainer: null,

            initialize: function(options) {
                this.options = options;
                initialize(this, this.options.$parent, this.options.paneNumber);
            },

            render: function() {
                return render(this);
            }
        });
    }());

    (function infoGraphicView() {
        N.views = N.views || {};
        N.views.InfoGraphicView = Backbone.View.extend({
            tagName: 'div',
            className: 'claro plugin-infographic',

            initialize: function() {
                this.render();
            },

            render: function() {
                var pluginModel = this.model,
                    pluginObject = pluginModel.get('pluginObject');

                var img = $('<img class="graphic" />').attr('src', pluginObject.infoGraphic);
                this.$el.append(img);

                var checkboxnode = $('<span>').get(0);
                this.$el.append(checkboxnode);

                var nscheckBox = new CheckBox({
                    name: "checkBox",
                    checked: !pluginModel.getShowHelpOnStartup(),
                    onChange: function(show) {
                        pluginModel.setShowHelpOnStartup(!show);
                    }
                }, checkboxnode);

                var lbl = $("<label>" + i18next.t("Don't Show This on Start") + "</label>")
                    .attr('for', nscheckBox.id);
                this.$el.append(lbl);

                var buttonnode = $('<span>').get(0);
                this.$el.append(buttonnode);

                var closeinfo = new Button({
                    label: "Continue",
                    onClick: function() {
                        pluginModel.set('displayHelp', false);
                        pluginObject.resize();
                    }
                }, buttonnode);

                if ($.i18n) {
                    $(this.$el).localize();
                }
            }
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

            if ($.i18n) {
                $(view.$el).localize();
            }

            return view;
        }

        N.views = N.views || {};
        N.views.TopbarPlugin = N.views.BasePlugin.extend({
            className: 'topbar-plugin',
            initialize: function(options) {
                this.options = options;
                this.options.$parent.append(this.$el);
                N.views.BasePlugin.prototype.initialize.call(this);
            },
            render: render,
            // Override handleLaunch so topbar plugins can have custom launch behavior.
            handleLaunch: function() {
                var pluginObject = this.model.get('pluginObject');
                if (pluginObject.closeOthersWhenActive) {
                    N.views.BasePlugin.prototype.handleLaunch.apply(this, arguments);
                } else {
                    pluginObject.activate();
                }
            },
            handleClear: function () {
                this.model.turnOff();
            }
        });
    }());
});
