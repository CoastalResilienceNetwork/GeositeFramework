﻿/*jslint nomen:true, devel:true */
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
        },

        getSelectedBasemapName: function () { return getSelectedBasemap(this).name; },
        getSelectedBasemapLayer:  function (esriMap) { return getSelectedBasemapLayer(this, esriMap); }
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
        view.esriMap = new esri.Map(view.$el.attr('id'));
        loadExtent(view);
        selectBasemap(view);
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

    function doIdentify(view, pluginModels, event) {
        // Only "Identify" if no plugin is selected (and therefore owns click events)
        if (!pluginModels.selected || pluginModels.selected.get('pluginObject').allowIdentifyWhenActive) {
            var map = view.esriMap,
                windowWidth = 300,
                windowHeight = 600,
                infoWindow = createIdentifyWindow(map, event, windowWidth, windowHeight),
                $resultsContainer = $('<div>').addClass('identify-results'),
                showIfLast = _.after(pluginModels.length, function () {
                    showIdentifyResults(infoWindow, $resultsContainer, windowWidth, windowHeight);
                });

            // Accumulate results (probably asynchronously), and show them when all are accumulated
            pluginModels.each(function (pluginModel) {
                pluginModel.identify(map, event.mapPoint, function (pluginTitle, result, width, height) {
                    if (result) {
                        var template = N.app.templates['template-result-of-identify'],
                            $html = $(template({ pluginTitle: pluginTitle }).trim());
                        $html.find('.identify-result').append(result);
                        $resultsContainer.append($html);
                        if (width)  { windowWidth  = Math.max(windowWidth,  width); }
                        if (height) { windowHeight = Math.max(windowHeight, height); }
                    }
                    showIfLast();
                });
            });
        }
    }

    dojo.require("esri.dijit.Popup");

    function createIdentifyWindow(map, event, width, height) {
        // Delete the current info window (after grabbing its parent DOM node)
        var $parent = $(map.infoWindow.domNode).parent();
        map.infoWindow.destroy();

        // Create a new info window
        var $infoWindow = $('<div>').addClass('identify-info-window').appendTo($parent),
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
        initialize: function () { initialize(this); },
        doIdentify: function (pluginModels, event) { doIdentify(this, pluginModels, event); },
        saveState: function () { saveExtent(this); }
    });

}(Geosite));
