/*jslint nomen:true, devel:true */
/*global Backbone, _, $, Geosite, esri, Azavea, setTimeout, dojo, dojox */

require(['use!Geosite',
         './js/Legend.js',
         './js/widgets/map_utils/main.js',
         './js/util/ajax.js',
         'esri/map',
         'esri/dijit/Scalebar',
         'esri/layers/OpenStreetMapLayer',
         'esri/layers/ArcGISTiledMapServiceLayer',
         'esri/geometry/Extent',
         'esri/SpatialReference',
         'esri/dijit/Search'
        ],
    function(N,
             Legend,
             MapUtils,
             ajaxUtil,
             Map,
             ScaleBar,
             OpenStreetMapLayer,
             ArcGISTiledMapServiceLayer,
             Extent,
             SpatialReference,
             Search) {
    'use strict';

    function getSelectedBasemapLayer(model, esriMap) {
        // Return an ESRI layer object for the currently-selected basemap spec
        var basemap = getSelectedBasemap(model);
        if (basemap.layer === undefined) {
            // This basemap has no layer yet, so make one and cache it
            if (basemap.name.toLowerCase() === 'openstreetmap') {
                basemap.layer = new OpenStreetMapLayer();
            } else {
                basemap.layer = new ArcGISTiledMapServiceLayer(basemap.url);
            }
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

        // Configure the esri proxy, for (at least) 2 cases:
        // 1) For WMS "GetCapabilities" requests
        // 2) When it needs to make an HTTP GET with a URL longer than 2000 chars
        esri.config.defaults.io.proxyUrl = "proxy.ashx";

        createMap(view);
    }

    function createMap(view) {
        var esriMap = Map(view.$el.attr('id'), {
                sliderPosition: 'top-right'
            }),
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
        initSearch(view);

        var scalebar = new ScaleBar({
            map: view.esriMap,
            scalebarUnit: 'dual'
        });

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
            initMapUtils(view, esriMap);

            // Cache the parent of the infowindow rather than re-select it every time.
            // Occasionally, the infoWindow dom node as accessed from the underlaying esri.map
            // would be detached from the body and the parent would not be accessible
            view.$infoWindowParent = $(esriMap.infoWindow.domNode).parent();

            if (!N.app.singlePluginMode) {
                setupSubregions(N.app.data.region.subregions, esriMap);
            }
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

        function initSearch(view) {
            var isMobileSingleAppMode = N.app.singlePluginMode &&
                window.matchMedia("screen and (max-device-width: 736px)").matches;
            // Add search control; have it be expandable & collapsible in mobile single plugin mode
            var search = new Search({
                map: view.esriMap,
                showInfoWindowOnSelect: false,
                enableHighlight: false,
                enableButtonMode: isMobileSingleAppMode,
                expanded: false, // this property only takes effect if `enableButtonMode` is `true`
            }, "search");

            // The translation lookup isn't ready when this is initialized.
            // A slight delay is needed.
            window.setTimeout(function() {
                // Required to set the placeholder text.
                var sources = search.get("sources");
                sources[0].placeholder = i18next.t("Find address or place");
                search.set("sources", sources);
                search.startup();
            }, 200);

            if (isMobileSingleAppMode) {
                // If the app's in mobile single app mode: hide title & subtitle on opening geocoder
                // search input, showing them again on close. 200ms delay to smooth animation
                search.on('focus', function() {
                    window.setTimeout(function() {
                        $('.nav-main-title').hide();
                        $('.nav-region-subtitle').hide();
                    }, 200)
                });
                search.on('blur', function() {
                    window.setTimeout(function() {
                        $('.nav-main-title').show();
                        $('.nav-region-subtitle').show();
                    }, 200)
                });
            }
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
        var mapNumber =  view.model.get('mapNumber'),
            regionData = N.app.data.region,
            id = 'legend-container-' + mapNumber,
            legend = new Legend(regionData, id);

        var redraw = function() {
            legend.render(getVisibleLayers());
        };

        function getServiceLegend(service) {
            var legendUrl = service.url + '/legend',
                data = ajaxUtil.get(legendUrl);
            if (ajaxUtil.shouldFetch(legendUrl)) {
                ajaxUtil.fetch(legendUrl).then(redraw);
            }
            return data && data.layers;
        }

        function getVisibleLayers() {
            var services = esriMap.getLayersVisibleAtScale(esriMap.getScale()),
                result = [];
            _.each(services, function (service) {
                var serviceInfo = view.model.serviceInfos[service.id];
                if (serviceInfo && service.visible &&
                    serviceInfo.pluginObject.showServiceLayersInLegend &&
                    service.visibleLayers) {
                    service.visibleLayers.sort(function(a, b) { return a - b; });
                    _.each(service.visibleLayers, function(layerId) {
                        var layer,
                            legend,
                            layerId = parseInt(layerId);

                        if (isWms(service)) {
                            layer = _getWMSLayer(service, layerId);
                            if (!layer) { return; }
                            legend = _getWMSLegend(layer);
                        } else {
                            layer = _getAGSLayer(service, layerId);
                            if (!layer) { return; }
                            legend = _getAGSLegend(service, layerId);
                        }

                        if (isLayerInScale(service, layer)) {
                            result.push({
                                service: service,
                                layer: layer,
                                legend: legend
                            });
                        }
                    });
                }

            });
            return result;
        }

        function isWms(service) {
            if (service.description && service.description.match(/WMS/i)) {
                return true;
            }
            return false;
        }

        function _getWMSLayer(service, layerId) {
            return _.findWhere(service.layerInfos, {name: layerId});
        }

        function _getWMSLegend(layer) {
            return layer.legendURL;
        }

        function _getAGSLayer(service, layerId) {
            return _.findWhere(service.layerInfos, {id: layerId});
        }

        function _getAGSLegend(service, layerId) {
            var serviceLegend = getServiceLegend(service);

            if (!serviceLegend) {
                return;
            }

            return _.findWhere(serviceLegend, {layerId: layerId});
        }

        // Filter out layers that are not visible at the current map scale.
        // Adapted from the ESRI dijit legend source code. (Ref: _isLayerInScale)
        function isLayerInScale(service, layer) {
            var scale = esriMap.getScale();
            var minScale = Math.min(service.minScale, layer.minScale) || service.minScale || layer.minScale || 0;
            var maxScale = Math.max(service.maxScale, layer.maxScale) || 0;
            return minScale === 0 || minScale > scale && maxScale < scale;
        }

        dojo.connect(esriMap, 'onUpdateEnd', redraw);
        dojo.connect(esriMap, 'onLayerAdd', redraw);
        dojo.connect(esriMap, 'onLayerRemove', redraw);
        dojo.connect(esriMap, 'onLayerSuspend', redraw);
        // Allow plugins to trigger a legend redraw by calling map.resize()
        dojo.connect(esriMap, 'resize', redraw);
    }

    function initMapUtils(view, esriMap) {
        var el = $('#map-utils-control').get(0);
        return new MapUtils({
            el: el,
            map: esriMap,
            app: N.app,
            regionData: N.app.data.region
        });
    }

    N.views = N.views || {};
    N.views.Map = Backbone.View.extend({
        $infoWindowParent: null,
        initialize: function () { initialize(this); },
        doIdentify: function (pluginModels, event) { N.doIdentify(this, pluginModels, event); },
        saveState: function () { saveExtent(this); }
    });
});
