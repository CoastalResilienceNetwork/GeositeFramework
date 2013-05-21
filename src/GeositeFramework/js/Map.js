/*jslint nomen:true, devel:true */
/*global Backbone, _, $, Geosite*/

(function (N) {
    'use strict';

    function getSelectedBasemapLayer(model, esriMap) {
        // Return an ESRI layer object for the currently-selected basemap spec
        var basemap = getSelectedBasemap(model);
        if (basemap.layer === undefined) {
            // This basemap has no layer yet, so make one and cache it
            basemap.layer = new esri.layers.ArcGISTiledMapServiceLayer(basemap.url);
            esriMap.addLayer(basemap.layer);
        }
        return basemap.layer;
    }

    function getSelectedBasemap(model) {
        // Return the selected basemap spec, after validation
        var basemaps = model.get('basemaps'),
        selectedBasemapIndex = model.get('selectedBasemapIndex'),
        valid = basemaps !== null &&
                selectedBasemapIndex !== null &&
                selectedBasemapIndex < basemaps.length;
        if (valid) {
            return basemaps[selectedBasemapIndex];
        } else {
            Azavea.logError("Internal error in basemap selector: no basemaps defined or invalid basemap index");
            return { name: "", url: "" };
        }
    }

    N.models = N.models || {};
    N.models.Map = Backbone.Model.extend({
        defaults: {
            mapNumber: null,
            basemaps: null,
            selectedBasemapIndex: 0,   // Both the map view and the basemap selector listen for changes to this attribute
            sync: false
        },

        initialize: function () {
            // deep-copy 'basemaps' because we're going to modify its elements by adding 'layer' properties
            this.set('basemaps', $.extend(true, [], this.get('basemaps')));

            // Use map model in permalinks
            N.app.hashModels.addModel(this, {
                id: 'map' + this.get('mapNumber'),
                attributes: ['extent', 'selectedBasemapIndex']
            });

            // Keep track of ArcGISDynamicMapServiceLayers added to the map
            this.serviceInfos = {};
        },

        getSelectedBasemapName: function () { return getSelectedBasemap(this).name; },
        getSelectedBasemapLayer: function (esriMap) { return getSelectedBasemapLayer(this, esriMap); },

        addService: function (service, plugin) {
            this.serviceInfos[service.id] = {
                service: service,
                pluginObject: plugin
            };
        },

        removeService: function (service) {
            delete this.serviceInfos[service.id];
        }

    });
}(Geosite));

(function (N) {
    'use strict';

    function initialize(view) {
        view.model.on('change:selectedBasemapIndex', function () { selectBasemap(view); });
        view.model.on('change:extent',               function () { loadExtent(view); });

        // Configure the esri proxy, for (at least) 2 cases:
        // 1) For WMS "GetCapabilities" requests
        // 2) When it needs to make an HTTP GET with a URL longer than 2000 chars
        esri.config.defaults.io.proxyUrl = "proxy.ashx";

        createMap(view);
    }

    function createMap(view) {
        var esriMap = new esri.Map(view.$el.attr('id'), { logo: false }),
            resizeMap = function resizeMap() {
                // When the element containing the map resizes, the 
                // map needs to be notified.  Do a slight delay so that
                // the browser has time to actually make the element visible.
                _.delay(function() {
                    if (view.$el.is(':visible')) {
                        var center = esriMap.extent.getCenter();
                        esriMap.reposition();
                        esriMap.resize(true);
                        esriMap.centerAt(center);
                    }
                }, 150);
            },
            loadEventFired = false;

        view.esriMap = esriMap;
        loadExtent(view);
        selectBasemap(view);
        

        // Wait for the map to load
        dojo.connect(esriMap, "onLoad", function () {
            loadEventFired = true;
            resizeMap();
            $(N).on('resize', resizeMap);

            // Add this map to the list of maps to sync when in sync mode
            N.app.syncedMapManager.addMapView(view);

            initLegend(view, esriMap);
            
            // Cache the parent of the infowindow rather than re-select it every time.
            // Occasionally, the infoWindow dom node as accessed from the underlaying esri.map
            // would be detached from the body and the parent would not be accessible 
            view.$infoWindowParent = $(esriMap.infoWindow.domNode).parent();
        });


        // On IE8, the map.onload event will often not fire at all, which breaks
        // the app entirely.  The map does, in fact, load and its loaded property is
        // set.  I put in this hack to check up on the event a little while after
        // it was created and manually raise the event if the library didn't do it.
        setTimeout(function() {
            if (!loadEventFired) {
                if (esriMap.loaded) esriMap.onLoad(esriMap);
            }
        }, 2500);
    }

    function loadExtent(view) {
        var x = view.model.get('extent'),
            extent = new esri.geometry.Extent(
                x.xmin, x.ymin, x.xmax, x.ymax,
                new esri.SpatialReference({ wkid: x.spatialReference.wkid })
            );
        view.esriMap.setExtent(extent);
    }

    function saveExtent(view) {
        view.model.set('extent', view.esriMap.extent);
    }

    function selectBasemap(view) {
        // Hide the current basemap layer
        if (view.currentBasemapLayer !== undefined) {
            view.currentBasemapLayer.hide();
        }
        // Show the new basemap layer (at index 0)
        view.currentBasemapLayer = view.model.getSelectedBasemapLayer(view.esriMap);
        view.currentBasemapLayer.show();
        view.esriMap.reorderLayer(view.currentBasemapLayer, 0);
    }

    dojo.require('esri.dijit.Legend');

    function initLegend(view, esriMap) {
        // Create default legend section
        var id = 'legend-' + view.model.get('mapNumber'),
            legendDijit = new esri.dijit.Legend({ map: esriMap, layerInfos: [] }, id);
        legendDijit.startup();

        // Update the legend whenever the map changes
        dojo.connect(esriMap, 'onUpdateEnd', updateLegend);

        function updateLegend() {
            var services = esriMap.getLayersVisibleAtScale(esriMap.getScale()),
                layerInfos = [];
            _.each(services, function (service) {
                var serviceInfo = view.model.serviceInfos[service.id];
                if (serviceInfo && serviceInfo.pluginObject.showServiceLayersInLegend) {
                    // This service was added by a plugin, and the plugin wants it in the legend
                    layerInfos.push({
                        layer: serviceInfo.service
                    });
                }
            });
            legendDijit.refresh(layerInfos);
        }
    }

    function doIdentify(view, pluginModels, event) {
        var map = view.esriMap,
            windowWidth = 300,
            windowHeight = 600,
            infoWindow = createIdentifyWindow(view, map, event, windowWidth, windowHeight),
            $resultsContainer = $('<div>').addClass('identify-results'),
            showIfLast = _.after(pluginModels.length, function () {
                showIdentifyResults(infoWindow, $resultsContainer, windowWidth, windowHeight);
            });

        // Accumulate results (probably asynchronously), and show them when all are accumulated
        pluginModels.each(function (pluginModel) {
            var clickPoint = { x: event.x, y: event.y };
            pluginModel.identify(event.mapPoint, clickPoint, processResults);
        });

        function processResults(pluginTitle, result, width, height) {
            if (result) {
                var template = N.app.templates['template-result-of-identify'],
                    $html = $($.trim(template({ pluginTitle: pluginTitle })));
                $html.find('.identify-result').append(result);
                $resultsContainer.append($html);
                if (width) { windowWidth = Math.max(windowWidth, width); }
                if (height) { windowHeight = Math.max(windowHeight, height); }
            }
            showIfLast();
        }
    }

    dojo.require("esri.dijit.Popup");

    function createIdentifyWindow(view, map, event, width, height) {
        map.infoWindow.destroy();

        // Create a new info window
        var $infoWindow = $('<div>').addClass('identify-info-window').appendTo(view.$infoWindowParent),
            infoWindow = new esri.dijit.Popup({ map: map }, $infoWindow.get(0));
        map.infoWindow = infoWindow;
        infoWindow.resize(width, height);
        infoWindow.setTitle(""); // without this call the title bar is hidden, along with its controls
        $infoWindow.find('.spinner').removeClass('hidden');
        infoWindow.show(event.mapPoint);
        return infoWindow;
    }

    function showIdentifyResults(infoWindow, $resultsContainer, width, height) {
        $(infoWindow.domNode).find('.spinner').addClass('hidden');
        if ($resultsContainer.children().length === 0) {
            $resultsContainer.append($('<div>').text('No information is available for this location.'));
        }
        infoWindow.resize(width, height);
        infoWindow.setContent($resultsContainer.get(0));
    }

    N.views = N.views || {};
    N.views.Map = Backbone.View.extend({
        $infoWindowParent: null,
        initialize: function () { initialize(this); },
        doIdentify: function (pluginModels, event) { doIdentify(this, pluginModels, event); },
        saveState: function () { saveExtent(this); }
    });

}(Geosite));
