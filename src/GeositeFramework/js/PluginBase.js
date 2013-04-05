// PluginBase.js -- superclass for plugin modules

define(["dojo/_base/declare"],
    function (declare) {
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

            identify: function (map, point, processResults) {
                var self = this;
                this._layerManager.identify(map, point, function (features) {
                    self._ui.formatIdentifiedFeatures(features, processResults);
                });
            }
        });

        // ------------------------------------------------------------------------
        // Identify

        dojo.require("esri.tasks.identify");
        dojo.require("dojo.DeferredList");

        function getMyServices(map) {
            // The ESRI map's "layers" are actually service objects (layer managers).
            // Filter out ones that aren't mine (they'll be undefined and therefore falsy)
            return _.filter(_.map(map.layerIds, map.getLayer), _.identity);
        }

        function identify(point, processResults) {
            var map = this.map,
                services = getMyServices(map),
                thinFeatureDeferreds = [],
                areaFeatureDeferreds = [];

            collectFeatures();
            processFeatures(function (features) {
                formatFeatures(features, processResults);
            });

            function collectFeatures() {
                // Identify all active layers, collecting responses in "deferred" lists
                _each(services, function (service) {
                    if (service.visibleLayers.length > 0) {
                        // This service has visible layers. Identify twice -- 
                        // once with loose tolerance to find "thin" features (point/line/polyline), and
                        // once with tight tolerance to find "area" features (polygon/raster).
                        identify(10, thinFeatureDeferreds);
                        identify(0, areaFeatureDeferreds);

                        function identify(tolerance, deferreds) {
                            identifyParams = new esri.tasks.IdentifyParameters();
                            identifyParams.tolerance = tolerance;
                            identifyParams.layerIds = service.visibleLayers;
                            identifyParams.width = map.width;
                            identifyParams.height = map.height;
                            identifyParams.geometry = point;
                            identifyParams.mapExtent = map.extent;

                            var identifyTask = new esri.tasks.IdentifyTask(serviceNode.url),
                                deferred = identifyTask.execute(identifyParams);
                            deferreds.push(deferred);
                        }
                    }
                });
            }

            function processFeatures(formatFeatures) {
                // When all responses are available, filter and format identified features
                new DeferredList(thinFeatureDeferreds.concat(areaFeatureDeferreds)).then(function () {
                    var thinFeatures = getFeatures(thinFeatureDeferreds, isThinFeature),
                        areaFeatures = getFeatures(areaFeatureDeferreds, isAreaFeature);
                    formatFeatures(thinFeatures.concat(areaFeatures));
                });

                function getFeatures(deferreds, filterFunction) {
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
                        template = N.app.templates['plugin-result-of-identify'];
                    _.each(features, function (feature) {
                        var html = template(feature).trim(),
                            $section = $(html).click(expandOrCollapseAttributeSection);
                        $result.append($section);
                    });
                    processResults($result.get(0), 400);
                }

                function expandOrCollapseAttributeSection() {
                    $(this).find('.attributes').slideToggle();
                }
            }

        }

    }
);