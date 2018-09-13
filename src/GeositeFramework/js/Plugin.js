/*jslint nomen:true, devel:true */
/*global Backbone, _, $ */

// A plugin wraps around a plugin object and manages it in backbone

require(['use!Geosite',
         'esri/map',
         'esri/layers/ArcGISDynamicMapServiceLayer',
         './js/Logger.js',
         'dojo/dom-style',
         'dijit/form/CheckBox',
         'dijit/form/Button'
        ],
    function(N,
             Map,
             ArcGISDynamicMapServiceLayer,
             Logger,
             domStyle,
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
                logger = new Logger(pluginName),
                resizers = {
                    setWidth: function(val) {
                        var d = $.Deferred(),
                            setter = function(w) {
                                return function() {
                                    $uiContainer.css({ width: "" });
                                    $uiContainer.removeClass(function() {
                                        var classes = this.className.split(" ");
                                        return _.filter(classes, function(c) {
                                            return /sidebar-width-.*/.test(c);
                                        }).join(" ");
                                    });
                                    $uiContainer.addClass("sidebar-width-" + w);
                                };
                            };
                        _.delay(function() {
                            if (typeof val === "string") {
                                d.then(setter(val));
                            } else if (typeof val === "number") {
                                d.then(function() {
                                    $uiContainer.css({ width: val });
                                });
                            }
                            d.resolve();
                            esriMap.resize(true);
                        }, 100);
                        return d.promise();
                    }
                },
                showMobileMap = (N.app.singlePluginMode && N.app.showMobileMap) ?
                    N.app.showMobileMap : _.noop(),
                showMobileContent = (N.app.singlePluginMode && N.app.showMobileContent) ?
                    N.app.showMobileContent : _.noop();

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
                        dispatcher: N.app.dispatcher,
                        suppressHelpOnStartup: _.partial(suppressHelpOnStartup, model),
                        resize: resizers,
                        singlePluginMode: N.app.singlePluginMode,
                        showMobileMap: showMobileMap,
                        showMobileContent: showMobileContent,
                    },
                    plugin: {
                        turnOff: _.bind(model.turnOff, model)
                    },
                    map: N.createMapWrapper(esriMap, mapModel, pluginObject),
                    container: ($uiContainer ? $uiContainer.find('.sidebar-content')[0] : undefined),
                    legendContainer: ($legendContainer ? $legendContainer[0] : undefined),
                    printButton: ($uiContainer ? $uiContainer.find('.plugin-print') : undefined)
                });
            } catch (e) {
                // Prevent the malfunctioning plugin from stopping the rest of the code execution
                console.error("/ --------------------");
                console.error("There was a problem initializing a plugin: " + pluginName);
                console.error(e.stack);
                console.error("-------------------- /");
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

        // Allow the plugin to ask the framework to store and provide a
        // flag for showing help when activating, across sessions
        function suppressHelpOnStartup(model, doSuppress) {
            model.setSuppressHelpOnStartup(doSuppress);
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
                startHelpKey: "-suppress-help-start",
                pluginObject: null,
                active: false,
                visible: false,
                pluginLayers: {},
                pluginLayersVisible: true
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

            // Instruct the plugin to display its in-app help
            showHelp: function () { },

            onSelectedChanged: function () {
                if (this.selected) {
                    this.set('active', true);
                    this.set('visible', true);
                    this.get('pluginObject').activate(!this.getSuppressHelpOnStartup());
                } else {
                    this.get('pluginObject').deactivate();
                    this.set('visible', false);
                    this.trigger('plugin:deselected');
                }
            },

            toggleLayers: function () {
                var currentPlugin = this.get('pluginObject'),
                    pluginLayersVisible = this.get('pluginLayersVisible');

                if (pluginLayersVisible) {
                    this.set('pluginLayers', currentPlugin.map.getMyLayers());
                    currentPlugin.map.removeAllLayers();
                    this.set('pluginLayersVisible', false);
                } else {
                    currentPlugin.map.addLayers(this.get('pluginLayers'));
                    this.set('pluginLayers', {});
                    this.set('pluginLayersVisible', true);
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
                        self.set('visible', false);
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

            getSuppressHelpOnStartup: function() {
                var pluginObject = this.get('pluginObject'),
                    showValueKey = pluginObject.toolbarName + this.get('startHelpKey'),
                    suppressHelpValue = localStorage[showValueKey];

                return suppressHelpValue ? JSON.parse(suppressHelpValue) : false;
            },

            setSuppressHelpOnStartup: function(val) {
                var pluginObject = this.get('pluginObject'),
                    showValueKey = pluginObject.toolbarName + this.get('startHelpKey');

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
                'click .plugin-launcher': 'handleLaunch',
                'click .plugin-clear': 'handleClear'
            },

            initialize: function () {
                var self = this;
                initialize(this);

                N.app.dispatcher.on('launchpad:activate-plugin', function(pluginName) {
                    if (pluginName === self.model.getId()) {
                        self.handleLaunch();
                    }
                });
            },

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
            handleClear: function handleClear() {
                this.model.turnOff();
            }

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
            if (model.get('pluginObject').infographic && !N.app.singlePluginMode) {
                addInfographicButton(view,
                    model.get('pluginObject').infographic,
                    model.get('pluginSrcFolder'))
            }
            N.views.BasePlugin.prototype.initialize.call(view);
        }

        function render(view) {
            var model = view.model,
                pluginTemplate = N.app.templates['template-sidebar-plugin'],
                pluginObject = model.get('pluginObject'),
                // The plugin icon looks active if the plugin is selected or
                // active (aka, running but not focused).  It is displayed if
                // it is currently displaying its UI.
                html = pluginTemplate(_.extend(model.toJSON(), {
                    selected: model.selected || model.get('active'),
                    displayed: model.selected,
                    fullName: model.get('pluginObject').fullName
                })),
                pluginContentHidden = model.collection.all({visible:false});

            view.$el.empty().append(html);
            view.$el.addClass(model.getId() + '-' + view.paneNumber);

            if (view.$uiContainer) {
                assignEvents(view.$uiContainer, model, view.paneNumber);

                if (view.model.selected === true) {
                    view.$uiContainer.show();
                } else {
                    view.$uiContainer.hide();
                }

                // Call the `resize` method on the Esri map, passing it
                // true for its `immediate` arg so that it will resize
                // immediately.
                if (pluginObject.map) {
                    pluginObject.map.resize(true);
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

        function addInfographicButton(view, infographicConfig, sourceFolder) {
            view.$uiContainer.append(N.app.templates['infographic-button-template']());
            view.$uiContainer.find('.nav-title').addClass('title-with-graphic');
            view.$uiContainer.find('.infographic-icon').on('click', function() {
                showInfographic(infographicConfig, sourceFolder);
            });
        }

        function showInfographic(infographicConfig, sourceFolder) {
            TINY.box.show({
                animate: true,
                url: sourceFolder + '/html/infographic.html',
                fixed: true,
                width: infographicConfig[0] || 350,
                height: infographicConfig[1] || 350
            });
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
                    hasHelp: pluginObject.hasHelp,
                    hasCustomPrint: pluginObject.hasCustomPrint,
                    sizeClassName: getPluginSizeClassName(pluginObject.size),
                    customWidth: getCustomPluginWidth(pluginObject.size, pluginObject.width),
                    hideMinimizeButton: pluginObject.hideMinimizeButton
                },
                $uiContainer = $($.trim(N.app.templates['template-plugin-container'](bindings)));

            view.$uiContainer = $uiContainer;

            // Attach to top pane element
            view.$el.parents().find('.content .nav-apps').after($uiContainer);

            // Tell the model about $uiContainer so it can pass it to the plugin object
            model.set('$uiContainer', $uiContainer);
        }

        function assignEvents($uiContainer, model, paneNumber) {
            // Note: assignEvents is called everytime the plugin is rendered.
            // In order to prevent events firing multiple times we need to unbind
            // before rebinding any events.  I've scoped these bindings so we
            // don't remove events added by plugin developers.
            $uiContainer
                // Minimize the plugin
                .find('.plugin-minimize')
                    .off('.deselect')
                    .on('click.deselect', function() {
                        model.deselect();
                }).end()
                // Listen for events to turn the plugin completely off
                .find('.plugin-off')
                    .off('.turnoff')
                    .on('click.turnoff', function () {
                        model.turnOff();
                }).end()
                // Unselect the plugin, but keep active
                .find('.plugin-close')
                    .off('.deselect')
                    .on('click.deselect', function () {
                        model.deselect();
                }).end()
                .find('.plugin-help')
                    .off('.showhelp')
                    .on('click.showhelp', function () {
                        pluginObject.showHelp();
                }).end()
                .find('.plugin-print')
                    .off('.initprint')
                    .on('click.initprint', function() {
                        initPrint(model, paneNumber);
                }).end();
        }

        function initPrint(model, paneNumber) {
            var modalConfirmDeferred = $.Deferred(),
                parseDeferred = $.Deferred(),
                preModalDeferred = $.Deferred(),
                postModalDeferred = $.Deferred(),
                pluginCssPath = model.get('pluginSrcFolder') + '/print.css',
                printCssClass = 'plugin-print-css',
                oppositePaneHideCssPath = 'css/print-hide-map' +
                    (paneNumber === 0 ? 1 : 0) + '.css',
                $printSandbox = $('#plugin-print-sandbox'),
                pluginObject = model.get('pluginObject');

            // Any previous plugin-prints may have left specific print css
            // or sandbox elements.  Clear all so that this new print routine
            // has no conflicts with other plugins.
            $('.' + printCssClass).remove();
            $printSandbox.empty();

            // add base plugin css
            addCss('css/print.css', 'base-plugin-print-css');

            // Add the plugin css
            addCss(pluginCssPath, printCssClass);

            // Hide the possible same plugin from the opposite map pane
            addCss(oppositePaneHideCssPath, printCssClass);

            // Give some time for the browser to parse the new CSS,
            // if this wasn't slightly delayed, occasionally the override would
            // not be present and print features wouldn't show up.
            _.delay(parseDeferred.resolve, 200);

            var mapReadyDeferred = setupPrintableMap(pluginObject.map,
                pluginObject,
                $printSandbox,
                modalConfirmDeferred,
                postModalDeferred);

            mapReadyDeferred.then(function(map) {
                // The plugin is given a deferred object to resolve when the page is ready
                // to be printed, a reference to an element where it can place printable
                // elements outside of its container, a reference to the map, and a reference
                // to the print modal sandbox, where it can add a form to collect user input.
                var $modalSandbox = $('#plugin-print-modal-content');
                pluginObject.prePrintModal(preModalDeferred, $printSandbox, $modalSandbox, map);

                // Execute the browser print when the plugin and print modal (if used) have responded.
                $.when(preModalDeferred, parseDeferred, modalConfirmDeferred, postModalDeferred).then(function() {
                    window.print();

                    // Close out the modal, which calls the closejs method
                    TINY.box.hide();
                });
            });
        }

        function setupPrintableMap(map, pluginObject, $printSandbox, modalConfirmDeferred, postModalDeferred) {
            var printModal = N.app.templates['template-plugin-print-modal']({ pluginName: pluginObject.toolbarName }),
                $printModal = $($.trim(printModal)),
                mapReadyDeferred = $.Deferred(),
                modalHeight = pluginObject.printModalSize[1],
                modalWidth = pluginObject.printModalSize[0],
                isMobileSingleAppMode = N.app.singlePluginMode &&
                    window.matchMedia("screen and (max-device-width: 736px)").matches;

            // If the plugin is not set up for a print modal,
            // resolve any pending pre-print map operations
            if (!pluginObject.usePrintModal) {
                modalConfirmDeferred.resolve();
                postModalDeferred.resolve();
                mapReadyDeferred.resolve();
                return mapReadyDeferred;
            }

            // Setup a print modal window for the user.
            // The plugin will provide the content
            TINY.box.show({
                animate: false,
                html: $printModal[0].outerHTML,
                height: modalHeight,
                width: isMobileSingleAppMode ? '96vw' : _.max([modalWidth, 500]),
                fixed: !isMobileSingleAppMode,
                maskopacity: 40,
                openjs: function () {
                    // Let the app know that the map is ready for modification
                    // for plugin print
                    mapReadyDeferred.resolve(map);

                    $('#print-modal-confirm').on('click', function() {
                        // Move the map from the main app area to to the sandbox where
                        // the plugin can mess with it's positioning among its other elements
                        var mapNode = $("#map-0").detach();
                        $(mapNode).appendTo($printSandbox);
                        map.resize();
                        map.reposition();

                        // Move the legend out of the map container for easier styling
                        var legendNode = $("#legend-container-0").detach();
                        $(legendNode).appendTo($printSandbox);

                        modalConfirmDeferred.resolve();

                        // Pass the modal contents to the plugin,
                        // so it can extract form values, etc.
                        var $modalContent = $(this).parent().siblings('#plugin-print-modal-content');
                        pluginObject.postPrintModal(postModalDeferred, $printSandbox, $modalContent, map);

                        // Move the scalebar inside the map container so
                        // that it stays with the map.
                        var scalebar = $('.esriScalebar').detach();
                        $(scalebar).appendTo('#map-0_root');
                    });
                },

                closejs: function () {
                    // Move the map and legend back to the original container
                    var mapNode = $('#map-0').detach();
                    var legendNode = $("#legend-container-0").detach();
                    $('.map-container').append(mapNode);
                    $('#map-0').append(legendNode);
                    map.resize(true);

                    // Move the scalebar back to it's original location
                    var scalebar = $('.esriScalebar').detach();
                    $(scalebar).appendTo('#map-0');

                    // Remove print related CSS
                    $('.base-plugin-print-css').remove();
                    $('.plugin-print-css').remove();

                    pluginObject.postPrintCleanup(map);
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

        function getPluginSizeClassName(size) {
            return 'sidebar-width-' + size;
        }

        function getCustomPluginWidth(size, width) {
            if (size === 'custom') {
                return 'width: ' + width + 'px;';
            } else {
                return '';
            }
        }

        function hasHelp(view) {
            var pluginObj = view.model.get('pluginObject');
            return pluginObj.hasHelp;
        }

        N.views = N.views || {};
        N.views.SidebarPlugin = N.views.BasePlugin.extend({
            tagName: 'div',
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
