/*jslint nomen:true, devel:true */
/*global Backbone, _, $, Geosite, esri, Azavea, setTimeout, dojo, dojox */

require(['use!Geosite',
         'esri/dijit/Legend',
         'esri/map',
         'esri/layers/ArcGISTiledMapServiceLayer',
         'esri/geometry/Extent',
         'esri/SpatialReference',
         'dojox/layout/ResizeHandle',
         'framework/widgets/ConstrainedMoveable'
        ],
    function(N,
             Legend,
             Map,
             ArcGISTiledMapServiceLayer,
             Extent,
             SpatialReference,
             ResizeHandle,
             ConstrainedMoveable) {
    'use strict';

    function getSelectedBasemapLayer(model, esriMap) {
        // Return an ESRI layer object for the currently-selected basemap spec
        var basemap = getSelectedBasemap(model);
        if (basemap.layer === undefined) {
            // This basemap has no layer yet, so make one and cache it
            basemap.layer = new ArcGISTiledMapServiceLayer(basemap.url);
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

    function initialize(view) {
        view.model.on('change:selectedBasemapIndex', function () { selectBasemap(view); });
        view.model.on('change:extent', function () {
            var currentExtent = view.model.get('extent');

            if (!_.isEqual(currentExtent, view.esriMap.extent)) {
                loadExtent(view);
            }
        });
        N.app.dispatcher.on('launchpad:free-explore', function (e) { freeExplore(e, view); });

        // Configure the esri proxy, for (at least) 2 cases:
        // 1) For WMS "GetCapabilities" requests
        // 2) When it needs to make an HTTP GET with a URL longer than 2000 chars
        esri.config.defaults.io.proxyUrl = "proxy.ashx";

        createMap(view);
    }

    function createMap(view) {
        var esriMap = Map(view.$el.attr('id')),
            resizeMap = _.debounce(function () {
                // When the element containing the map resizes, the 
                // map needs to be notified.  Do a slight delay so that
                // the browser has time to actually make the element visible.
                    if (view.$el.is(':visible')) {
                        var center = esriMap.extent.getCenter();
                        esriMap.reposition();
                        esriMap.resize(true);
                        esriMap.centerAt(center);
                    }
            }, 300),
            loadEventFired = false;

        view.esriMap = esriMap;
        loadExtent(view);
        selectBasemap(view);

        var throttledSet = _.debounce(function() { view.model.set('extent', view.esriMap.extent) }, 1000);
        dojo.connect(view.esriMap, 'onExtentChange', function(newExtent) {
            var currentExtent = view.model.get('extent');

            if (!_.isEqual(currentExtent, newExtent)) {
                throttledSet();
            }
        });

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

            setupSubregions(N.app.data.region.subregions, esriMap);
        });

        function setupSubregions(subregions, esriMap) {
            // Subregions are not required
            if (!subregions) return;

            var subRegionManager = new N.controllers.SubRegion(subregions, esriMap);

            subRegionManager.onActivated(function(subregion) {
                view.model.trigger('subregion-activate', subregion);
            });

            subRegionManager.onDeactivated(function(subregion) {
                view.model.trigger('subregion-deactivate', subregion);
            });
        }

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

    function freeExplore(e, view) {
        if (N.app.models.screen.get('mainPaneNumber') === view.model.get('mapNumber')) {
            view.esriMap.setExtent(e.extent);
        }
    }

    function loadExtent(view) {
        var x = view.model.get('extent'),
            extent = Extent(
                x.xmin, x.ymin, x.xmax, x.ymax,
                new SpatialReference({ wkid: x.spatialReference.wkid })
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

    function initLegend(view, esriMap) {
        // Create default legend section
        var mapNumber =  view.model.get('mapNumber'),
            id = 'legend-' + mapNumber,
            legendDijit = new Legend({ map: esriMap, layerInfos: [] }, id);

        legendDijit.startup();

        view.$legendEl = $(legendDijit.domNode);
        view.$legendEl.addClass('esriLegendService');
        view.legendContainerId = "legend-container-" + mapNumber;

        var $legendContainer = $('#' + view.legendContainerId);

        // Make the legend resizable and moveable
        var handle = new ResizeHandle({
            targetId: view.legendContainerId,
            activeResize: true,
            animateSizing: false
        });
            
        handle.placeAt(view.legendContainerId);

        new ConstrainedMoveable(
            document.getElementById(view.legendContainerId), {
                handle: $legendContainer.find('.legend-header')[0],
                within: true
            });

        $legendContainer.find('.legend-close').click(function() {
            $legendContainer.hide();
        });

        // Update the legend whenever the map changes. Certain layer events can only
        // be captured by the catchall `onUpdateEnd`, so bind to that. However, the
        // body of `updateLegend` immediately looks at visible layers, while some may
        // still asynchronously be in queue to become visible. As a protection, call
        // `updateLegend` explicitly when a layer has finished adding.
        //
        // Add legends for tile layers fires both of these events, which results in
        // the legend flickering (because of our manual redraw), so make sure the
        // function is not called repetitively.
        var debouncedUpdateLegend = _.debounce(updateLegend, 100);
        dojo.connect(esriMap, 'onUpdateEnd', debouncedUpdateLegend);
        dojo.connect(esriMap, 'onLayerAdd', debouncedUpdateLegend);

        function updateLegend() {
            var services = esriMap.getLayersVisibleAtScale(esriMap.getScale()),
                layerInfos = [],
                serviceOptOut = 0;

            _.each(services, function (service) {
                var serviceInfo = view.model.serviceInfos[service.id];
                if (serviceInfo && serviceInfo.pluginObject.showServiceLayersInLegend) {
                    // This service was added by a plugin, and the plugin wants it in the legend
                    var layer;
                    if (serviceInfo.service.declaredClass === "esri.layers.FeatureLayer") {
                        layer = { layer: serviceInfo.service, title: serviceInfo.service.id };
                    } else {
                        layer = { layer: serviceInfo.service };
                    }
                    layerInfos.push(layer);
                } else if (serviceInfo &&
                    serviceInfo.service.declaredClass !== "esri.layers.FeatureLayer") {
                    // Track layers that have opted out of having their 
                    // services shown in the legend
                    serviceOptOut++;
                }

            });
            if (view.arrangedLegend) {
                view.arrangedLegend.destroy();
            }
            legendDijit.refresh(layerInfos);

            // The ESRI Legend Dijit renders as a series of nested tables and divs
            // which makes having a re-flow layout impossible.  We re-render the legend
            // list by removing each legend and sub-legend 'nugget' and moving them into
            // a flat list, which we can do a simple css based reflow on.
            var legendNuggets = [],
                nuggetCount = 0;

            // Each map service returns a .esriLegendService element with legend elements
            // for each layer in the service. Only those layers that are on the map have
            // visible legend elements.
            view.$legendEl.find('.esriLegendService').each(function(idx, legendParent) {
                var $groupLayers = $(legendParent).find('.esriLegendGroupLayer:visible');
                if ($groupLayers.length > 0) {
                    legendNuggets.push($groupLayers);
                    nuggetCount += $groupLayers.length;
                } else {
                    // Tile layer legends are rendered outside of a .esriLegendService element.
                    legendNuggets.push($(legendParent).find('div:visible'));
                    nuggetCount += 1;
                }
            });

            legendNuggets.sort(heightComparator);

            view.$legendEl.empty()
                .append.apply(view.$legendEl, legendNuggets);

            // Compare the total number of visible layers on the map to the number
            // of legendNuggets to determine if the legend has gotten info for all
            // visible layers. If not, recur with a delay.
            //
            // This is a hack, because sometimes when loading from browser cache,
            // layerAdd events don't fire.

            // Get all the layers on the map, and filter out graphic layers (i.e. subregion boundaries)
            // and layers that aren't visible;
            var totalVisibleLayers =_.filter(esriMap.getLayersVisibleAtScale(), function(layer) {
                return !layer.graphics && layer.visible;
            });

            // Subtract one for the base layer and one for each 
            // custom legend that is visible and has children
            var customLegendsActive = view.$legendEl.parent()
                    .find('.custom-legend:visible').has('*').length,
                expectedMissingLayerCount = 1 + customLegendsActive + serviceOptOut;

            if ((totalVisibleLayers.length - expectedMissingLayerCount) !== nuggetCount) {
                _.delay(updateLegend, 750);
            }
        }
    }

    // Compare DOM elements by their computed height
    function heightComparator(a, b) {
        var ha = $(a).height(), 
            hb = $(b).height();

        if (ha < hb) {
            return -1;
        }
        if (ha > hb) {
            return 1;
        }
        return 0;
    };

    N.views = N.views || {};
    N.views.Map = Backbone.View.extend({
        $infoWindowParent: null,
        initialize: function () { initialize(this); },
        doIdentify: function (pluginModels, event) { N.doIdentify(this, pluginModels, event); },
        saveState: function () { saveExtent(this); }
    });
});
