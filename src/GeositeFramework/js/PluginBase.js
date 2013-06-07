// PluginBase.js -- superclass for plugin modules

define(["dojo/_base/declare",
        "dojo/_base/xhr"
       ],
    function (declare, xhr) {

        dojo.require("esri.tasks.identify");
        dojo.require("dojo.DeferredList");

        return declare(null, {
            toolbarName: "",
            fullName: "",
            toolbarType: "sidebar",
            showServiceLayersInLegend: true,
            allowIdentifyWhenActive: false,

            activate: function () {},
            deactivate: function () {},
            hibernate: function () {},
            getState: function () {},

            identify: identify
        });

        // ------------------------------------------------------------------------
        // Default "Identify" -- format feature info returned by esri.tasks.IdentifyTask
        // Plugins that don't like this default behavior should override identify().

        function getMyAgsServices(map) {
            // The ESRI map's "layers" are actually service objects (layer managers).
            // Filter out ones that aren't mine. 
            // (Because "map" is a WrappedMap, layers that aren't mine will be undefined.)
            return _.filter(_.map(map.layerIds, map.getLayer), function (layer) {
                return (layer && layer.declaredClass === "esri.layers.ArcGISDynamicMapServiceLayer");
            });
        }

        function getMyWmsServices(map) {
            return _.filter(_.map(map.layerIds, map.getLayer), function (layer) {
                return (layer && layer.declaredClass === "esri.layers.WMSLayer");
            });
        }

        function identify(mapPoint, clickPoint, processResults) {
            var map = this.map,
                agsServices = getMyAgsServices(map),
                wmsServices = getMyWmsServices(map),
                agsThinFeatureDeferreds = [],
                agsAreaFeatureDeferreds = [],
                wmsFeatureDeferreds = [];

            collectFeatures();
            processFeatures(function (features) {
                formatFeatures(features, processResults);
            });

            function collectFeatures() {
                // Ask each active service to identify its features. Collect responses in "deferred" lists.
 
                _.each(agsServices, function (service) {
                    if (service.visibleLayers.length > 0 && service.visibleLayers[0] !== -1) {
                        // This service has visible layers. Identify twice -- 
                        // once with loose tolerance to find "thin" features (point/line/polyline), and
                        // once with tight tolerance to find "area" features (polygon/raster).
                        identify(10, agsThinFeatureDeferreds);
                        identify(0, agsAreaFeatureDeferreds);

                        function identify(tolerance, deferreds) {
                            var identifyParams = new esri.tasks.IdentifyParameters();

                            identifyParams.tolerance = tolerance;
                            identifyParams.layerIds = service.visibleLayers;
                            identifyParams.width = map.width;
                            identifyParams.height = map.height;
                            identifyParams.geometry = mapPoint;
                            identifyParams.mapExtent = map.extent;

                            var identifyTask = new esri.tasks.IdentifyTask(service.url),
                                deferred = identifyTask.execute(identifyParams);
                            deferreds.push(deferred);
                        }
                    }
                });

                _.each(wmsServices, function (service) {
                    if (service.visibleLayers.length > 0) {

                        var zoomLevel = map.getZoom(),
                            buffer;


                        // TODO - These numbers are nonsensical
                        // 
                        // after continuous fiddling, I found no
                        // configuration that was better for getting
                        // vector (point) features from a treemap
                        // layer I brought in.
                        //
                        // Raster AND vector (polygon) layers that 
                        // the client provided work at all sizes.
                        //
                        // buffer appears not to be very important
                        // because the server is only returning one
                        // result, the closest one.
                        //
                        if (zoomLevel <= 12) {
                            buffer = 100000000;
                        } else if (zoomLevel === 13) {
                            buffer = 5000000;
                        } else {
                            buffer = 10;
                        }

                        identify(buffer, wmsFeatureDeferreds);


                        function identify(tolerance, deferreds) {
                            var url,
                            templateGetFeatureInfoUrl = _.template(
                                esri.config.defaults.io.proxyUrl + '?' + service.url + '?' +
                                    'SERVICE=WMS&' +
                                    'VERSION=1.1.1&' +
                                    'REQUEST=GetFeatureInfo&' +
                                    'LAYERS=<%=layers%>&' +
                                    'QUERY_LAYERS=<%=layers%>&STYLES=&' +
                                    'BBOX=<%=bbox%>' +
                                    '&HEIGHT=<%=height%>&' +
                                    'WIDTH=<%=width%>&' +
                                    'FORMAT=image%2Fpng&' +
                                    'INFO_FORMAT=text%2Fplain' +
                                    '&SRS=EPSG%3A3857&' +
                                    'X=<%=x%>&Y=<%=y%>&' +
                                    'BUFFER=<%=buffer%>');
 
                            _.each(service.visibleLayers, function (layer) {
                                var deferred = xhr.get({
                                    url: templateGetFeatureInfoUrl({
                                        x: clickPoint.x,
                                        y: clickPoint.y,
                                        layers: layer,
                                        bbox: [map.extent.xmin, map.extent.ymin, map.extent.xmax, map.extent.ymax].join(","),
                                        height: map.height,
                                        width: map.width,
                                        buffer: tolerance
                                    }),
                                    handleAs: 'text'
                                });
                                deferreds.push(deferred);

                                // TODO - find a better way to transport this information
                                //
                                // The problem is that, at the time this deferred object is
                                // created, we have a url and a layer name. Then, when the
                                // deferred is resolved, it will return a text object that
                                // is parsed to only contain feature info. There's no easy
                                // way to poke this data through. A solution is to modify
                                // and test the parsing code to also extract the layer name,
                                // then compare it to a hash with layer names as keys and
                                // descriptions (titles) as values. An ideal solution is to
                                // modify the structure of this code to have access to this
                                // information at the time the callback is added to the
                                // deferred.
                                //
                                deferred._layerName = _.find(service.layerInfos, 
                                                             function (layerInfo) {
                                                                 return layerInfo.name == layer; 
                                                             }).title;
                            });
                        }
                    }
                });
            }

            function processFeatures(formatFeatures) {
                // When all responses are available, filter and format identified features
                var allDeferreds = agsThinFeatureDeferreds.concat(agsAreaFeatureDeferreds).concat(wmsFeatureDeferreds),
                    DeferredList = new dojo.DeferredList(allDeferreds);

                DeferredList.then(function () {
                    var thinFeatures = getAgsFeatures(agsThinFeatureDeferreds, isThinFeature),
                        areaFeatures = getAgsFeatures(agsAreaFeatureDeferreds, isAreaFeature),
                        wmsFeatures = getWmsFeatures(wmsFeatureDeferreds);
                    formatFeatures(thinFeatures.concat(areaFeatures).concat(wmsFeatures));
                });


                function getWmsFeatures(wmsDeferreds) {
                    var identifiedFeatures = [];

                    _.each(wmsDeferreds, function (wmsDeferred) {
                        wmsDeferred.addCallback(function (text) {
                            // we previously had logic to take the results
                            // of an ajax call to the arcgis identify api
                            // which returns a nicely formatted object.
                            //
                            // For WMS features, we make a call to the WMS
                            // server which returns plain text that is parsed,
                            // packed into an object similar to the arcgis
                            // results, and sent along to the presentation
                            // layer.
                            //
                            // Also, arcgis identify calls produce a default
                            // value, which the presentation logic is built
                            // around, but wms calls do not. The getFirstPair
                            // function is used to extract a default value
                            // from the parsed response for this purpose.
                            var features = parseWMSGetFeatureInfoText(text);

                            _.each(features, function (rawFeatureObject) {
                                var getFirstPair = function (obj) {
                                    var keys, k, v;
                                    keys = Object.keys(obj);
                                    if (keys && keys.length > 0) {
                                        k = keys[0];
                                        v = obj[k];
                                    } else {
                                        k = "";
                                        v = "";
                                    }
                                    return { fieldName: k, value: v };
                                },
                                    firstPair = getFirstPair(rawFeatureObject),
                                    featureObject = {
                                        displayFieldName: firstPair.fieldName,
                                        layerName: wmsDeferred._layerName,
                                        feature: {
                                            attributes: rawFeatureObject
                                        },
                                        value: firstPair.value
                                    };

                                identifiedFeatures.push(featureObject);
                            });
                        });
                    });
                    return identifiedFeatures;
                }

                function getAgsFeatures(deferreds, filterFunction) {
                    var identifiedFeatures = [];
                    _.each(deferreds, function (deferred) {
                            deferred.addCallback(function (features) {
                                _.each(features, function (feature) {
                                    if (filterFunction(feature.feature)) {
                                        identifiedFeatures.push(feature);
                                    }
                                });
                            });

                    });
                    return identifiedFeatures;
                }

                function isThinFeature(feature) { return _.contains(['Point', 'Line', 'Polyline'], feature.attributes.Shape); }
                function isAreaFeature(feature) { return !isThinFeature(feature); }
            }

            function formatFeatures(features, processResults) {
                if (features.length === 0) {
                    processResults(false);
                } else {
                    var $result = $('<div>'),
                        template = Geosite.app.templates['plugin-result-of-identify'];
                    _.each(features, function (feature) {
                        var html = $.trim(template(feature)),
                            $section = $(html);
                        if (Object.keys(feature.feature.attributes).length > 1) {
                            $section.addClass("with-arrow");
                            $section.click(expandOrCollapseAttributeSection);
                        }
                        $result.append($section);
                    });
                    processResults($result.get(0), 400);
                }

                function expandOrCollapseAttributeSection() {
                    $(this).find('.attributes').slideToggle();
                    $(this).toggleClass("collapsed");
                }
            }

            function parseWMSGetFeatureInfoText(text) {
                var matches,
                attributes,
                textFeatures = text ? text.split(/[-]+\n/) : [],
                features = null;

                _.each(textFeatures, function itterateFeatures(textFeature){
                    matches = _.map(textFeature.split('\n'), function (line) {
                        // This regex matches the 'attribute_name = attribute value'
                        // plain text format returned from GetFeatureInfo
                        return line.match(/(\w+) = ([^\n]+)/);
                    });
                    attributes = null;
                    _.each(matches, function (match) {
                        // The plain text response contains '------------' separator
                        // lines which will produce a null match value.
                        if (match) {
                            attributes = attributes || {};
                            // match[0] will be the whole line 'foo = bar baz'
                            // and [1] and [2] will be the captured values
                            attributes[match[1]] = match[2];
                        }
                    });
                    if (attributes) {
                        features = features || [];
                        features.push(attributes);
                    }
                });

                return features;
            };

        }

    }
);
