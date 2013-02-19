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
        var regionData = model.get('regionData');
        model.set('map', new N.models.Map({
            basemaps: regionData.basemaps,
            initialExtent: regionData.initialExtent
        }));
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

            plugins.add(plugin);
        });

        model.set('plugins', plugins);
    }

    // initPlugins() is separate from createPlugins() because:
    //     - We need to create plugin objects before rendering (so we can render their toolbar names).
    //     - We need to pass a map object to the plugin constructors, but that isn't available until after rendering. 

    function initPlugins(model, esriMap) {
        var wrappedMap = N.createMapWrapper(esriMap),
            paneNumber = model.get('paneNumber');
        model.get('plugins').each(function (pluginModel) {
            var pluginObject = pluginModel.get('pluginObject');
            if (_.isFunction(pluginObject.initialize)) {
                pluginObject.initialize({
                    app: null,
                    map: wrappedMap,
                    container: N.app.views.panes[paneNumber].el  // TODO: use plugin-specific DOM element
                });
            }
        });
    }

    N.models = N.models || {};
    N.models.Pane = Backbone.Model.extend({
        defaults: {
            paneNumber: 0,
            isMain: false,
            regionData: null,
            map: null,
            plugins: null
        },
        initialize: function () { return initialize(this); },
        initPlugins: function (esriMap) { return initPlugins(this, esriMap); }
    });

}(Geosite));

(function (N) {
    'use strict';

    function initialize(view) {
        render(view);
        initBasemapSelector(view);
        initMapView(view);
        initPluginViews(view);
    }

    function render(view) {
        var paneTemplate = N.app.templates['template-pane'],
            html = paneTemplate({
                index: view.model.get('paneNumber'),
                isMain: view.model.get('isMain')
            });
        view.$el.append(html);

        renderSidebarLinks(view);
        return view;
    }

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
            model: view.model.get('map'),
            el: view.$('.basemap-selector')
        });
    }

    function initMapView(view) {
        var mapView = new Geosite.views.Map({
            model: view.model.get('map'),
            el: view.$('.map'),
            paneNumber: view.model.get('paneNumber')
        });

        // Wait for the map to load, then initialize the plugins. 
        // (Otherwise some map properties aren't available, e.g. extent)
        var esriMap = mapView.esriMap;
        dojo.connect(esriMap, "onLoad", function () {
            view.model.initPlugins(esriMap);
        });
    }

    function initPluginViews(view) {
        // create a view for each plugin model (it will render), and add its element
        // to the appropriate plugin section
        var $sidebar = view.$('.plugins'),
            $topbar = view.$('.tools');

        view.model.get('plugins').each(function (plugin) {
            var toolbarType = plugin.get('pluginObject').toolbarType;
            if (toolbarType === 'sidebar') {
                var pluginView = new N.views.SidebarPlugin({ model: plugin });
                $sidebar.append(pluginView.$el);
            } else if (toolbarType === 'map') {
                var pluginView = new N.views.TopbarPlugin({ model: plugin });
                $topbar.append(pluginView.$el);
            }
        });
    }

    N.views = N.views || {};
    N.views.Pane = Backbone.View.extend({
        initialize: function (view) { initialize(this); }
    });

}(Geosite));
