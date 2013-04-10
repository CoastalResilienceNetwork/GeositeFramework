/*jslint nomen:true, devel:true */
/*global Backbone, _, $, Geosite*/

// A pane represents the app work area and contains a sidebar and a map

(function (N) {
    'use strict';

    function initialize(model) {
        initMap(model);
        createPlugins(model);
    }

    function initMap(model) {
        var extent = getHomeExtent(model),
            mapModel = new N.models.Map({
                basemaps: model.get('regionData').basemaps,
                extent: extent,
                mapNumber: model.get('paneNumber')
            });
        model.set('mapModel', mapModel);
    }

    function getHomeExtent(model) {
        var x = model.get('regionData').initialExtent,
            extent = new esri.geometry.Extent(
                x[0], x[1], x[2], x[3],
                new esri.SpatialReference({ wkid: 4326 /*lat-long*/ })
            );
        return extent;
    }

    function createPlugins(model) {
        // Iterate over plugin classes in top-level namespace,
        // instantiate them, and wrap them in backbone objects

        var plugins = new N.collections.Plugins();

        _.each(N.plugins, function (PluginClass, i) {
            var pluginObject = new PluginClass(),
                plugin = new N.models.Plugin({
                    pluginObject: pluginObject,
                    pluginSrcFolder: model.get('regionData').pluginFolderNames[i]
                });

            // Load plugin only if it passes a compliance check
            if (plugin.isCompliant()) {
                plugins.add(plugin);
            } else {
                console.log('Plugin: Pane[' + model.get('paneNumber') + '] - ' + 
                    pluginObject.toolbarName +
                    ' is not loaded due to improper interface');
            }
        });

        model.set('plugins', plugins);
    }

    // initPlugins() is separate from createPlugins() because:
    //     - We need to create plugin objects before rendering (so we can render their toolbar names).
    //     - We need to pass a map object to the plugin constructors, but that isn't available until after rendering. 

    function initPlugins(model, esriMap) {
        var mapModel = model.get('mapModel');
        model.get('plugins').each(function (pluginModel) {
            pluginModel.initPluginObject(mapModel, esriMap);
        });
    }

    N.models = N.models || {};
    N.models.Pane = Backbone.Model.extend({
        defaults: {
            paneNumber: 0,
            regionData: null,
            mapModel: null,
            plugins: null
        },

        initialize: function () { return initialize(this); },

        initPlugins: function (esriMap) { return initPlugins(this, esriMap); },

        getHomeExtent: function () { return getHomeExtent(this); }
    });

}(Geosite));

(function (N) {
    'use strict';

    function initialize(view) {
        render(view);
        initBasemapSelector(view);
        initMapView(view);
        initPluginViews(view);

        N.app.models.screen.on('change', function () { renderSidebar(view); });
    }

    function render(view) {
        var paneTemplate = N.app.templates['template-pane'],
            html = paneTemplate(view.model.toJSON());
        view.$el.append(html);
        renderSidebar(view);
        renderSidebarLinks(view);
    }

    function renderSidebar(view) {
        var sidebarTemplate = N.app.templates['template-sidebar'],
            paneNumber = view.model.get('paneNumber'),
            data = _.extend(N.app.models.screen.toJSON(), {
                isMain: paneNumber === N.app.models.screen.get('mainPaneNumber'),
                alternatePaneNumber: paneNumber === 0 ? 1 : 0
            }),
            html = sidebarTemplate(data);

        view.$('.bottom.side-nav').empty().append(html);
    }

    // TODO: Sidebar links aren't in the prototype - do we have anything for them?
    function renderSidebarLinks(view) {
        var regionData = view.model.get('regionData'),
            linkTemplate = N.app.templates['template-sidebar-link'],
            $links = view.$('.sidebar-links');
        _.each(regionData.sidebarLinks, function (link) {
            var html = linkTemplate({ link: link });
            $links.append(html);
        });
    }

    function initBasemapSelector(view) {
        new Geosite.views.BasemapSelector({
            model: view.model.get('mapModel'),
            el: view.$('.basemap-selector')
        });
    }

    function initMapView(view) {
        view.mapView = new Geosite.views.Map({
            model: view.model.get('mapModel'),
            el: view.$('.map'),
            paneNumber: view.model.get('paneNumber')
        });

        var esriMap = view.mapView.esriMap;

        // Wait for the map to load
        dojo.connect(esriMap, "onLoad", function () {
            // Initialize plugins now that all map properties are available (e.g. extent)
            view.model.initPlugins(esriMap);

            // Clicking the map means "Identify" contents at a point
            dojo.connect(esriMap, "onClick", doIdentify);
        });

        function doIdentify(event) {
            var pluginModels = view.model.get('plugins');
            if (!pluginModels.selected || pluginModels.selected.get('pluginObject').allowIdentifyWhenActive) {
                // No plugin owns click events, so proceed
                view.mapView.doIdentify(pluginModels, event);
            }
        }
    }

    function initPluginViews(view) {
        // create a view for each plugin model (it will render), and add its element
        // to the appropriate plugin section
        var $sidebar = view.$('.plugins'),
            $topbar = view.$('.tools');

        view.model.get('plugins').each(function (plugin) {
            var toolbarType = plugin.get('pluginObject').toolbarType;
            if (toolbarType === 'sidebar') {
                new N.views.SidebarPlugin({ model: plugin, $parent: $sidebar });
            } else if (toolbarType === 'map') {
                var pluginView = new N.views.TopbarPlugin({ model: plugin });
                $topbar.append(pluginView.$el);
            }
        });
    }

    N.views = N.views || {};
    N.views.Pane = Backbone.View.extend({
        mapView: null,

        initialize: function (view) { initialize(this); },

        events: {
            'click .home-button': function () {
                this.mapView.esriMap.setExtent(this.model.getHomeExtent());
            }
        }
    });

}(Geosite));
