﻿/*jslint nomen:true, devel:true */
/*global _, $, Geosite, esri, localStorage */

// PluginBase.js -- superclass for plugin modules

define(["dojo/_base/declare",
        "dojo/_base/xhr",
        "dojo/aspect",
        "dojo/_base/lang",
        "dojo/on",
        "dojo/query",
        "dojo/NodeList-traverse",
        "dojo/dom-style",
        "dojo/dom-construct",
        "dojo/dom-class",
        "dojo/Evented",
        "esri/tasks/IdentifyTask",
        "esri/tasks/IdentifyParameters",
        "dojo/DeferredList",
        "dojo/_base/Deferred",
        "dijit/layout/ContentPane",
        "dijit/form/CheckBox",
        "dijit/form/Button"
       ],
    function (declare,
                xhr,
                aspect, 
                lang, 
                on, 
                query, 
                NodeListtrav, 
                domStyle, 
                domConstruct, 
                domClass, 
                Evented,
                dIdentifyTask, 
                IdentifyParameters, 
                dDeferredList, 
                Deferred, 
                ContentPane, 
                CheckBox, 
                Button
                ) {

        var URL_PATTERN = /^https?:\/\/.+/,
            isBlacklisted;

        return declare([Evented], {
            toolbarName: "",
            fullName: "",
            toolbarType: "sidebar",
            showServiceLayersInLegend: true,
            allowIdentifyWhenActive: false,
            resizable: true,
            width: 300,
            height: 400,

            activate: function () {},
            deactivate: function () {},
            hibernate: function () {},
            resize: function () {},
            getState: function () {},
            setState: function () {},

            showInfographic: CheckandShowInfographic,

            identify: identify,
            constructor: function(args) {
                isBlacklisted = _.partial(_.contains, Geosite.app.data.region.identifyBlacklist);
                declare.safeMixin(this,args);
                aspect.after(this,'activate', lang.hitch(this,this.showInfographic));
            }
        });

        function CheckandShowInfographic(override) {
            if (this.infoGraphic) {
                var showValueKey = this.toolbarName + " showinfographic",
                    doNotShow = localStorage[showValueKey] === 'true';

                if (!this.infoGraphicArea) {
                    var pluginContainer = query(this.container).parent(),
                        headers = pluginContainer.children(".plugin-container-header"),
                        pluginContainerInner = pluginContainer.children(".plugin-container-inner"),
                        moreinfo = domConstruct.create("a", {
                            href: "javascript:;",
                            title: "View the info-graphic",
                            innerHTML:"?"
                        });

                    this.mainPanel = pluginContainerInner[0];

                    on(moreinfo, "click", lang.hitch(this, function() {
                        this.showInfographic(true);
                    }));

                    headers[0].appendChild(moreinfo);

                    var img = domConstruct.create('img', {
                        src: this.infoGraphic,
                        'class': 'graphic'
                    });
                    this.infoGraphicArea = domConstruct.create("div");
                    this.infoGraphicArea.appendChild(img);

                    domClass.add(this.infoGraphicArea, "claro plugin-infographic");

                    var checkboxnode = domConstruct.create("span");
                    this.infoGraphicArea.appendChild(checkboxnode);
                    this._nscheckBox = new CheckBox({
                        name: "checkBox",
                        checked: doNotShow,
                        onChange: lang.hitch(this, function (show) {
                            localStorage.setItem(showValueKey, show);
                        })
                    }, checkboxnode);

                    var noshow = domConstruct.create("label", {
                        innerHTML: "Don't Show This on Start ",
                        'for': this._nscheckBox.id
                    });
                    this.infoGraphicArea.appendChild(noshow);

                    var buttonnode = domConstruct.create("span");
                    this.infoGraphicArea.appendChild(buttonnode);

                    var closeinfo = new Button({
                        label: "Continue",
                        onClick: lang.hitch(this, function() {
                            this.showInfographic(false);
                        })
                    }, buttonnode);

                    pluginContainer[0].appendChild(this.infoGraphicArea);
                }

                this._nscheckBox.attr("checked", doNotShow);

                var showInfoGraphic = typeof override !== 'undefined' ? !!override : !doNotShow;
                domStyle.set(this.infoGraphicArea, 'display', showInfoGraphic ? 'block' : 'none');
                domStyle.set(this.mainPanel, 'display', showInfoGraphic ? 'none' : 'block');

                // Disable resizing when infographic is active
                setResizable(this, this.resizable && !showInfoGraphic);
                // Plugin window should expand to fit content when infographic is active
                if (showInfoGraphic) {
                    setWidth(this, null);
                    setHeight(this, null);
                } else {
                    setWidth(this, this.width);
                    setHeight(this, this.height);
                }
            }
        }

        function setWidth(model, width) {
            model.emit('setWidth', width);
        }

        function setHeight(model, height) {
            model.emit('setHeight', height);
        }

        function setResizable(model, resizable) {
            model.emit('setResizable', resizable);
        }

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
                    if (service.visibleLayers.length > 0 && service.visibleLayers[0] !== -1) {
                        // This service has visible layers. Identify twice -- 
                        // once with loose tolerance to find "thin" features (point/line/polyline), and
                        // once with tight tolerance to find "area" features (polygon/raster).
                        identify(10, agsThinFeatureDeferreds);
                        identify(0, agsAreaFeatureDeferreds);

                        function identify(tolerance, deferreds) {
                            var identifyParams = new IdentifyParameters();

                            identifyParams.tolerance = tolerance;
                            identifyParams.layerIds = service.visibleLayers;
                            identifyParams.width = map.width;
                            identifyParams.height = map.height;
                            identifyParams.geometry = mapPoint;
                            identifyParams.mapExtent = map.extent;

                            var identifyTask = new dIdentifyTask(service.url),
                                deferred = identifyTask.execute(identifyParams);
                            deferred._layerInfos = service.layerInfos;
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
                            $section.find('.result-of-identify').on('click',
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
