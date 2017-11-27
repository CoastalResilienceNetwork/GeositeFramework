define([
        "use!Geosite",
        "esri/geometry/Polyline",
        "esri/geometry/Polygon",
        "esri/geometry/geodesicUtils",
        "esri/geometry/webMercatorUtils",
        "esri/tasks/GeometryService",
        "esri/geometry/ScreenPoint",
        "esri/geometry/mathUtils",
        "esri/units",
        "esri/dijit/InfoWindow",
        "esri/symbols/SimpleFillSymbol",
        "esri/symbols/SimpleLineSymbol",
        "esri/symbols/SimpleMarkerSymbol",
        "esri/graphic",
        "esri/layers/GraphicsLayer"
    ],
    function(N,
             Polyline,
             Polygon,
             geodesicUtils,
             webMercatorUtils,
             GeometryService,
             ScreenPoint,
             mathUtils,
             units,
             InfoWindow,
             SimpleFillSymbol,
             SimpleLineSymbol,
             SimpleMarkerSymbol,
             Graphic,
             GraphicsLayer) {

        var AgsMeasure = function (opts) {

            var options = _.extend({
                map: null,
                introTemplate: '',
                tooltipTemplate: '',
                infoBubbleTemplate: '',
                // It is preferable to provide a custom geometry server, but
                // this url is non-warranty "production" ready
                geomServiceUrl: 'http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer',

                pointSymbol: new SimpleMarkerSymbol(
                    SimpleMarkerSymbol.STYLE_CIRCLE, 10,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                        new dojo.Color([105, 105, 105]), 1),
                        new dojo.Color([80, 80, 80, 0.35])),

                lineSymbol: new SimpleLineSymbol(
                        esri.symbol.SimpleLineSymbol.STYLE_DASH,
                        new dojo.Color([105, 105, 105]), 2),

                polygonSymbol: new SimpleFillSymbol(
                    SimpleFillSymbol.STYLE_SOLID,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASH,
                        new dojo.Color([105, 105, 105]), 2),
                        new dojo.Color([105, 105, 105, 0.25])),

                hoverLineSymbol: new SimpleLineSymbol(
                        SimpleLineSymbol.STYLE_SOLID,
                        new dojo.Color([105, 105, 105]), 2),

                hoverPointSymbol: new SimpleMarkerSymbol(
                    SimpleMarkerSymbol.STYLE_CIRCLE, 15,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                        new dojo.Color([255, 0, 0]), 1),
                        new dojo.Color([255, 0, 0, 0.35])),

                esriLengthUnits: [units.MILES, units.KILOMETERS,
                                  units.METERS, units.FEET],
                esriAreaUnits: [units.SQUARE_MILES, units.SQUARE_KILOMETERS,
                                units.ACRES, units.HECTARES]

            }, opts),

            _unitsLookup = {
                esriMiles: "mi",
                esriSquareMiles: "mi",
                esriMeters: "m",
                esriKilometers: "km",
                esriSquareKilometers: "km",
                esriAcres: "ac",
                esriHectares: "ha",
                esriFeet: "ft"
            },

            _points = [],
            _originPointEvent = null,
            _defaultOriginPointGraphic = null,
            _firstNodeClickBuffer = 20, // measured in pixels
            _renderedLength = [],
            _pointLayer = null,
            _outlineLayer = null,
            _hoverLine = null,
            _eventHandles = {},
            _$tooltip = $('<div>'),
            _introTemplate,
            _popupTemplate,
            _tooltipTemplate,
            _geometrySvc,
            _introPopup = null,

            showIntroPopup = function() {
                var map = options.map,
                    $parent = $(map.infoWindow.domNode).parent();
                    $infoWindow = $('<div>').appendTo($parent),
                    infoWindow = new InfoWindow({ map: map }, $infoWindow.get(0));

                map.infoWindow.destroy();

                infoWindow.startup();
                map.setInfoWindow(infoWindow);

                infoWindow.setTitle('');
                infoWindow.setContent(_introTemplate());
                infoWindow.resize(300, 75);

                $(infoWindow.domNode).addClass('measure-info-window');
                infoWindow.show(map.extent.getCenter());

                if ($.i18n) {
                    $parent.localize();
                }

                _introPopup = infoWindow;
            },

            showResultPopup = function(results) {
                // Delete the current info window (after grabbing its parent DOM node)
                var map = options.map,
                    $parent = $(map.infoWindow.domNode).parent();

                map.infoWindow.destroy();

                // Create a new info window at the starting measure node
                var $infoWindow = $('<div>').appendTo($parent),
                    infoWindow = new InfoWindow({ map: map }, $infoWindow.get(0));
                infoWindow.startup();
                map.infoWindow = infoWindow;
                $(infoWindow.domNode).addClass('measure-info-window'); // style it ourselves
                map.infoWindow.setContent(_popupTemplate(results));
                map.infoWindow.setTitle(""); // hides title div
                map.infoWindow.show(_points[0]);

                $(infoWindow.domNode).on('click', '[data-action]', function() {
                    reset();
                });

                // Default to showing km
                $('.measure-unit-value').hide();
                $('.measure-unit-value.km').show();
        
                // Only show specific units of measurement on the final popup
                $('.measure-unit-filter').click(function() {
                    var unit = $(this).data('unit'),
                        altUnit = $(this).data('alt-unit');

                    $('.measure-unit-value').hide();
                    $('.measure-unit-value.' + unit).show();

                    // Some area only units don't have equivilents for length
                    if (altUnit) {
                        $('.measure-unit-value.measure-unit-length.' + altUnit).show();
                    }
                });

                if ($.i18n) {
                    $parent.localize();
                }
            },

            finish = function (results) {
                // Finish the measurement, so add a final popup with
                // all available info

                showResultPopup(results);

                // Stop listening for events
                deactivate();
            },

            deactivate = function () {
                // Shut down all the events being listened for and enable
                // default map zooming
                _.each(_eventHandles, dojo.disconnect);
                options.map.enableDoubleClickZoom();
                _$tooltip.hide();

                N.app.restoreIdentify();
            },

            reset = function () {
                deactivate();

                options.map.infoWindow.hide();

                _pointLayer.clear();
                _outlineLayer.clear();

                _points = [];
                _originPointEvent = null;
                _defaultOriginPointGraphic = null;
                _renderedLength = [];
                _hoverLine = null;
                _eventHandles = {};

                _$tooltip.empty().show();
            },

            setupMeasureEvents = function () {
                // Track clicks and hovers while the measure tool is active
                _eventHandles.move =
                    dojo.connect(options.map, "onMouseMove", handleMapMouseMove);

                _eventHandles.doubleClick =
                    dojo.connect(options.map, "onDblClick", handleMapDoubleClick);

                _eventHandles.graphicMouseOver =
                    dojo.connect(_pointLayer, 'onMouseOver', handleMarkerMouseOver);

                _eventHandles.graphicMouseOut =
                    dojo.connect(_pointLayer, 'onMouseOut', handleMarkerMouseOut);

                _eventHandles.graphicClick =
                    dojo.connect(_pointLayer, 'onClick', handleMarkerClick);

                _eventHandles.graphicDoubleClick =
                    dojo.connect(_pointLayer, 'onDblClick', handleMarkerDblClick);
            },

            getLength = function(line) {
                return _.map(options.esriLengthUnits, function (uom) {
                    return {
                        uom: _unitsLookup[uom],
                        length: _.head(geodesicUtils.geodesicLengths([line], uom))
                    };
                });
            },

            getArea = function(polygon) {
                return _.map(options.esriAreaUnits, function (uom) {
                    return {
                        uom: _unitsLookup[uom],
                        area: _.head(geodesicUtils.geodesicAreas([polygon], uom))
                    };
                });
            },

            calculateDistance = function (points) {
                // Calculate the total distance from a series of ordered points
                var polyline = new Polyline();
                polyline.setSpatialReference(options.map.spatialReference);
                polyline.addPath(points);

                var geoLine = webMercatorUtils.webMercatorToGeographic(polyline);
                return getLength(geoLine);
            },

            handleMapDoubleClick = function (evt) {
                // Treat this click as a measurement node
                handleMapClick(evt);

                // Remove the hover graphic
                _hoverLine.setGeometry(null);

                // Stop measuring
                finish({
                    areas: null,
                    lengths: _.map(calculateDistance(_points), function (l) {
                        return { uom: l.uom, length: Azavea.numberToString(l.length, 2) };
                    })
                });
            },

            formatTooltip = function (segments, lines) {
                var lengthText = function (l) {
                    return { uom: l.uom, length: Azavea.numberToString(l.length, 0) };
                };
                return _tooltipTemplate({
                    instructions: i18next.t('Double-click to end a line segment. Single-click the first node to end a polygon.'),
                    lengthLabel: i18next.t('Total Length'),
                    segmentLabel: i18next.t('Segment Length'),
                    segmentLengths: _.map(segments, lengthText),
                    totalLengths: _.map(lines, lengthText)
                });
            },

            handleMapMouseMove = function (evt) {
                // Use the last entered point, and the hover point to
                // create a temporary line which follows the mouse cursor
                var path = _.last(_points, 1),
                    line = new Polyline(),
                    geographicLine = null,
                    tipText = '';

                path.push(evt.mapPoint);
                line.setSpatialReference(options.map.spatialReference);
                line.addPath(path);

                _hoverLine.setGeometry(line);

                // Calculate the length of the line, using a geographic coordindate system
                geographicLine = webMercatorUtils.webMercatorToGeographic(line);
                var geoLineLength = getLength(geographicLine);

                // calculate the total length for each UoM
                var lengths = _.union(_renderedLength, geoLineLength),
                    addOrUpdate = function (total, segment) {
                        total[segment.uom] = (total[segment.uom] || 0) + segment.length;
                        return total;
                    },
                    totalsByUom = _.reduce(lengths, addOrUpdate, {}),
                    splitIntoSingleObjs = function (obj) {
                        return _.chain(obj)
                            .pairs() // split the accumulator object into key-value (uom/length) pairs
                            .map(function(pair) { // map each pair array into single object
                                return { uom: _.head(pair), length: _.last(pair) };
                            })
                            .value();
                    },
                    totalLengths = splitIntoSingleObjs(totalsByUom);

                // Format the segment and line lengths
                tipText = formatTooltip(geoLineLength, totalLengths);


                // Update the popup to also track the mouse cursor, with the
                // formatted text
                _$tooltip
                    .html(tipText)
                    .offset({
                        top: evt.clientY + 10,
                        left: evt.clientX + 10
                    });
            },

            pointsMakeValidPolygon = function () {
                return (_points && _points.length > 2);
            },

            handleMapClick = function (evt) {
                // Hide intro popup after first click.
                if (_introPopup) {
                    options.map.infoWindow.hide();
                }
                if (pointsMakeValidPolygon()) {
                    var originP = new ScreenPoint(_originPointEvent.x, _originPointEvent.y),
                        bufferP = new ScreenPoint(evt.clientX, evt.clientY),
                        len = mathUtils.getLength(originP, bufferP);
                    if (len < _firstNodeClickBuffer) {
                        finishMeasureAsPolygon();
                    } else {
                        continueMeasureAndAddPoint(evt);
                    }
                } else {
                    continueMeasureAndAddPoint(evt);
                }
            },

            continueMeasureAndAddPoint = function (evt) {
                // Track each point clicked to create a line segment for
                // measuring length
                _points.push(evt.mapPoint);

                // Add the graphic of the line node to the map.  An index attribute
                // is added to the graphic to enable querying of node-added order
                var pointGraphic = new Graphic(evt.mapPoint, options.pointSymbol,
                    { index: _points.length });
                _pointLayer.add(pointGraphic);

                if (_points.length === 1) {
                    // The first point has been added, start listening
                    // for measure events
                    setupMeasureEvents();

                    // Cache the event generated when clicking the first point. this will
                    // be needed to calculate the distance from origin of subsequent clicks
                    _originPointEvent = evt;

                    _defaultOriginPointGraphic = pointGraphic;

                    // Double clicks are handled exclusively by this tool while active
                    options.map.disableDoubleClickZoom();

                    // Setup the hover line symbology and add to the map
                    _hoverLine = new Graphic();
                    _hoverLine.setSymbol(options.hoverLineSymbol);
                    _outlineLayer.add(_hoverLine);

                } else {
                    // An additional point has been added to the measurement,
                    // take the two most recent points, and draw a line from them
                    var line = new Polyline();
                    line.setSpatialReference(options.map.spatialReference);
                    line.addPath(_.last(_points, 2));

                    var lineGraphic = new Graphic(line, options.lineSymbol);
                    _outlineLayer.add(lineGraphic);
                }

                // Cache a copy of the total line length so far, so we don't
                // have to recalculate frequently on mouse move events
                var calculated = calculateDistance(_points);

                // Only update the _renderedLength if calculated is a valid number
                // This is an IE10 workaround.
                _renderedLength = calculated;
            },

            setDefaultOriginPointSymbol = function (graphic) {
                graphic.setSymbol(options.pointSymbol);
            },

            setHoverPointSymbol = function (graphic) {
                graphic.setSymbol(options.hoverPointSymbol);
            },

            isFirstNode = function (evt) {
                // Is this the node which begins the measure line?
                return evt.graphic.attributes && evt.graphic.attributes.index === 1;
            },

            handleMarkerMouseOver = function (evt) {
                // Check if the graphic the mouse is on was the first
                // node added to the measure line
                if (isFirstNode(evt) && pointsMakeValidPolygon()) {
                    // Change the style of the node to demonstrate that it
                    // can be clicked to complete as polygon
                    setHoverPointSymbol(evt.graphic);
                }
            },

            handleMarkerMouseOut = function (evt) {
                // Return the node to the deafult symbol, if it was
                // the first node added
                if (isFirstNode(evt)) {
                    setDefaultOriginPointSymbol(evt.graphic);
                }
            },

            handleMarkerDblClick = function (evt) {
                finishPolygonOrStopProp(evt);
            },

            handleMarkerClick = function (evt) {
                finishPolygonOrStopProp(evt);
            },

            finishPolygonOrStopProp = function (evt) {
                if (pointsMakeValidPolygon()) {
                    tryToFinishMeasureAsPolygon(evt);
                } else {
                    dojo.stopEvent(evt);
                }
            },

            tryToFinishMeasureAsPolygon = function (evt) {
                if (isFirstNode(evt) && pointsMakeValidPolygon()) {
                    dojo.stopEvent(evt);
                    finishMeasureAsPolygon();
                }
            },

            finishMeasureAsPolygon = function() {
                // If the first measurement node was clicked, and there
                // has already been a line drawn, close the line into a
                // polygon

                // Make the last point be the same coordinates of the first point
                // and create a polygon out of it
                _points.push(_points[0]);
                var polygon = new Polygon(options.map.spatialReference);

                // If the user has drawn the polygon ring anti-clockwise, reverse the ring
                // to make it a valid esri geometry.

                if (!polygon.isClockwise(_points)) {
                    _points = _points.reverse();
                }

                polygon.addRing(_points);

                // If the polygon self interesects, simplify it using the geometry service
                if (polygon.isSelfIntersecting(polygon) && _geometrySvc) {
                    _geometrySvc.simplify([polygon], function (simplifiedPolygons) {
                        setMeasureOutput(simplifiedPolygons[0]);
                    });
                } else {
                    setMeasureOutput(polygon);
                }
            },

            // Assumes polygon is valid at this point
            setMeasureOutput = function (polygon)
            {
                var geoPolygon = webMercatorUtils.webMercatorToGeographic(polygon),
                    areas = getArea(geoPolygon);

                // Remove our lines for the outline layer and replace them
                // with the new polygon area
                _outlineLayer.clear();
                _outlineLayer.add(new Graphic(polygon, options.polygonSymbol));

                // Change the first node symbol to the default as we finish
                setDefaultOriginPointSymbol(_defaultOriginPointGraphic);

                finish({
                    areas: _.map(areas, function (a) {
                        return { uom: a.uom, area: Azavea.numberToString(a.area, 2) };
                    }),
                    lengths: _.map(calculateDistance(_points), function (l) {
                        return { uom: l.uom, length: Azavea.numberToString(l.length, 2) };
                    })
                });
            };

            // Public methods
            return {
                initialize: function () {
                    _outlineLayer = new GraphicsLayer();
                    _pointLayer = new GraphicsLayer();

                    // Ordering of layers is important to not get hover-out events
                    // from a point when a line graphic is intersects it.
                    options.map.addLayer(_outlineLayer);
                    options.map.addLayer(_pointLayer);
                    var $map = $(options.map.container);
                    _$tooltip.appendTo($map);

                    _introTemplate = _.template(options.introTemplate);
                    _popupTemplate = _.template(options.infoBubbleTemplate);
                    _tooltipTemplate = _.template(options.tooltipTemplate);

                    if (options.geomServiceUrl) {
                        _geometrySvc = new GeometryService(options.geomServiceUrl);
                    }
                },

                deactivate: reset,

                activate: function () {
                    // Clear any previous measurements
                    reset();
                    showIntroPopup();

                    _eventHandles.click =
                        dojo.connect(options.map, "onClick", handleMapClick);

                    N.app.suspendIdentify();
                }
            };
        };

        return AgsMeasure;
    }
);
