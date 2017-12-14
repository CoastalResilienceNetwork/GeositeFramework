/*jslint nomen:true, devel:true */
/*global _, $, Geosite, esri, localStorage */

// PluginBase.js -- superclass for plugin modules

define(["dojo/_base/declare",
        "dojo/_base/xhr",
        "dojo/on",
        "esri/tasks/IdentifyTask",
        "esri/tasks/IdentifyParameters",
        "dojo/DeferredList",
        "dojo/_base/Deferred",
        "use!jqueryui",
        "use!chosen",
        "use!pips"
       ],
    function (declare,
                xhr,
                on,
                dIdentifyTask,
                IdentifyParameters,
                dDeferredList,
                Deferred,
                jqueryui,
                chosen,
                pips
                ) {

        var URL_PATTERN = /^https?:\/\/.+/,
            isBlacklisted;

        return declare(null, {
            toolbarName: "",
            fullName: "",
            toolbarType: "sidebar",
            showServiceLayersInLegend: true,
            allowIdentifyWhenActive: false,
            hasHelp: false,

            // Allow the framework to put a custom print button for this plugin
            hasCustomPrint: false,

            // Show a modal dialog for plugin printing
            usePrintModal: false,

            // The [width, height] of the print modal
            printModalSize: [500, 400],

            // This option changes the default launch behavior and is only applicable to topbar plugins.
            // If true, this will deselect other active plugins when launched. If false, this will
            // not call the Picky select/deselect methods. Instead, only the plugin 'activate' method
            // will be called.
            closeOthersWhenActive: true,

            // The [width, height] of the infographic
            // If defined, adds a button to the titlebar that opens an infographic
            // in a modal. Infographic is sourced from infographic.html.
            infographic: null,

            size: 'small', // small, large, or custom
            width: 300, // only used if 'custom' is specified for size
            icon: "globe",

            // If true, the minimize button is hidden in the plugin title bar
            hideMinimizeButton: false,

            initialize: function() {},
            activate: function () {},
            deactivate: function () {},
            hibernate: function () {},
            resize: function () {},
            getState: function () {},
            setState: function () {},
            subregionActivated: function() {},
            subregionDeactivated: function() {},
            validate: function () { return true; },

            // Auto-resolve the print deferred if the plugin does not implement this method.
            // preModalDeferred: deferred object to resolve when the printing can commence
            // $printSandbox: DOM element which the framework provides for printable element arrangement
            // mapObject: an ESRI map object referencing the main map
            // modalSandbox: DOM element which gets rendered in the print modal
            prePrintModal: function (preModalDeferred, $printSandbox, mapObject, modalSandbox) { preModalDeferred.resolve(); },

            // Auto-resolve the modal deferred if the plugin does not implement this method.
            // postModalDeferred: deferred object to resolve after the print modal has been dimissed
            // modalSandbox: DOM element which gets rendered in the print modal. Plugins can now check the value of inputs/form elements
            // mapObject: an ESRI map object referencing the main map
            postPrintModal: function (postModalDeferred, modalSandbox, mapObject) { postModalDeferred.resolve(); },

            // Reset any modifications made during the print process.
            // mapObject: an ESRI map object referencing the main map
            postPrintCleanup: function(mapObject) {},

            // Called when switching from infographic to the primary view or vice versa.
            onContainerVisibilityChanged: function (visible) {},

            identify: identify,

            constructor: function(args) {
                isBlacklisted = _.partial(_.contains, Geosite.app.data.region.identifyBlacklist);
                declare.safeMixin(this,args);
            }
        });

        // ------------------------------------------------------------------------
        // Default "Identify" -- format feature info returned by esri.tasks.IdentifyTask
        // Plugins that don't like this default behavior should override identify().

        function getMyAgsServices(map) {
            // The ESRI map's "layers" are actually service objects (layer managers).
            // Filter out ones that aren't mine.
            // (Because "map" is a WrappedMap, layers that aren't mine will be undefined.)
            return _.filter(_.map(map.layerIds, map.getLayer), function (layer) {
                return (layer &&
                    (
                        (layer.declaredClass === "esri.layers.ArcGISDynamicMapServiceLayer") ||
                        (layer.declaredClass === "esri.layers.ArcGISTiledMapServiceLayer") ||
                        (layer.declaredClass === "esri.layers.FeatureLayer")
                    ));
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
                    if (service.visible && service.visibleLayers.length > 0 && service.visibleLayers[0] !== -1) {
                        // This service has visible layers. Identify twice --
                        // once with loose tolerance to find "thin" features (point/line/polyline), and
                        // once with tight tolerance to find "area" features (polygon/raster).

                        // When zoomed in close (high zoom level) we want a wider tolerance area,
                        // than when zoomed far out (low zoom level), with at least a 2px min.
                        // Using a fixed number would return "too many" features when zoomed out
                        // then there were small features clustered near each other.  This is a
                        // little magic and was developed by trial and error.
                        var zoomTolerance = map.getZoom() * (3 / 8) + 2;
                        ags_identify(zoomTolerance, agsThinFeatureDeferreds);
                        ags_identify(0, agsAreaFeatureDeferreds);
                    }

                    function ags_identify(tolerance, deferreds) {
                        var identifyParams = new IdentifyParameters();

                        identifyParams.tolerance = tolerance;
                        identifyParams.layerIds = service.visibleLayers;
                        identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_VISIBLE;
                        identifyParams.width = map.width;
                        identifyParams.height = map.height;
                        identifyParams.geometry = mapPoint;
                        identifyParams.mapExtent = map.extent;
                        identifyParams.returnGeometry = true;

                        var identifyTask = new dIdentifyTask(service.url),
                            deferred = identifyTask.execute(identifyParams);
                        deferred._layerInfos = service.layerInfos;
                        deferreds.push(deferred);
                    }
                });

                _.each(wmsServices, function (service) {
                    if (service.visible && service.visibleLayers.length > 0) {

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

                        wms_identify(buffer, wmsFeatureDeferreds);
                    }

                    function wms_identify(tolerance, deferreds) {
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
                });
            }

            function processFeatures(formatFeatures) {
                // When all responses are available, filter and format identified features
                var allDeferreds = agsThinFeatureDeferreds.concat(agsAreaFeatureDeferreds).concat(wmsFeatureDeferreds),
                    deferredList = new dDeferredList(allDeferreds);

                deferredList.then(function () {
                    var thinFeatures = getAgsFeatures(agsThinFeatureDeferreds, isThinFeature),
                        areaFeatures = getAgsFeatures(agsAreaFeatureDeferreds, isAreaFeature),
                        wmsFeatures = getWmsFeatures(wmsFeatureDeferreds);
                    formatFeatures(thinFeatures.concat(areaFeatures).concat(wmsFeatures));
                });


                function getWmsFeatures(wmsDeferreds) {
                    var identifiedFeatures = [];

                    _.each(wmsDeferreds, function (wmsDeferred) {
                        wmsDeferred.addCallback(function (text) {
                            // we have logic on the Ags side to take the results
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
                            // around, but wms calls do not. The getFirstAttribute
                            // function is used to extract a default value
                            // from the parsed response for this purpose.
                            var features = parseWMSGetFeatureInfoText(text);

                            _.each(features, function (rawFeatureObject) {
                                var firstPair = getFirstAttribute(rawFeatureObject),
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

                function getFirstAttribute (obj) {
                    // a helper method for extracting the first eligible key
                    // value pair from an object that is not located in the
                    // global blacklist.
                    var eligibleKeys = _.reject(_.keys(obj), isBlacklisted),
                        key = eligibleKeys && eligibleKeys.length > 0 ? eligibleKeys[0] : "",
                        value = key === "" ? "" : obj[key];

                    return { fieldName: key, value: value };
                }

                function addAgsLayerDataWhereMissing(feature, deferred) {
                    var firstAttribute = getFirstAttribute(feature.feature.attributes);

                    feature.displayFieldName = feature.displayFieldName || firstAttribute.fieldName;
                    // We don't have access to the alias for this field, so clean it up a little by
                    // swapping underscores for spaces.
                    feature.displayFieldName = feature.displayFieldName.replace(/_/g, ' ');
                    feature.value = feature.value || firstAttribute.value;

                    if (!feature.layerName) {
                        if (deferred._layerInfos &&
                            deferred._layerInfos.length > feature.layerId) {
                            feature.layerName = deferred._layerInfos[feature.layerId].name;
                        } else {
                            feature.layerName = "(...)";
                        }
                    }
                }

                function getAgsFeatures(deferreds, filterFunction) {
                    var identifiedFeatures = [];
                    _.each(deferreds, function (deferred) {
                            deferred.addCallback(function (features) {
                                _.each(features, function (feature) {
                                    if (filterFunction(feature.feature)) {
                                        addAgsLayerDataWhereMissing(feature, deferred);
                                        identifiedFeatures.push(feature);
                                    }
                                });
                            });

                    });
                    return identifiedFeatures;
                }

                function isThinFeature(feature) {
                    return _.contains(['point', 'line', 'polyline'], feature.geometry.type);
                }

                function isAreaFeature(feature) { return !isThinFeature(feature); }
            }

            function formatFeatures(features, processResults) {
                if (features.length === 0) {
                    processResults(false);
                } else {
                    var $result = $('<div>'),
                        template = Geosite.app.templates['plugin-result-of-identify'];

                    _.each(features, function (feature) {
                        var html, $section,
                            UrlWrapAndDropBlacklisted = function (attributes, key) {
                                if (!isBlacklisted(key)) {
                                    attributes[key] =
                                        urlWrappedIfUrl(feature.feature.attributes[key]);
                                }
                                return attributes;
                            };

                        // each feature object has a special attribute stored in
                        // feature.value as well as a collection of attributes in
                        // feature.feature.attributes. Preprocess all of these to
                        // wrap URL strings in hyperlinks. Preprocess just attributes
                        // to remove blacklisted attributes from the final output.
                        feature.feature.attributes = _.reduce(_.keys(feature.feature.attributes),
                                                              UrlWrapAndDropBlacklisted, {});
                        feature.value = urlWrappedIfUrl(feature.value);


                        html = $.trim(template(feature)),
                        $section = $(html);
                        if (Object.keys(feature.feature.attributes).length > 1) {
                            $section.addClass("with-arrow");
                            // make the outer result-of-identify section expand
                            // but prevent propagation from the inner sections,
                            // for the purpose of hyperlink clicking, copy and
                            // pasting, casual browsing, etc.
                            $section.click(expandOrCollapseAttributeSection);
                            $section.find('[data-class="result-of-identify-inner"]').on('click',
                                function (e) { e.stopPropagation(); });
                        }
                        $result.append($section);
                    });
                    processResults($result.get(0), 400);
                }

                function urlWrappedIfUrl (value) {
                    if (URL_PATTERN.test(value)) {
                        return '<a target="_blank" href="' + value + '">'
                            + value + '</a>';
                    } else {
                        return value;
                    }
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
