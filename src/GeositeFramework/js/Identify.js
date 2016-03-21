/*jslint nomen:true, devel:true */
/*global _, $, Geosite, dojo, esri */

// Adds the 'Identify' feature to the map view.
// Identify allows the user to click on a point on the map
// and ask each active plugin to return any relevant information
// about that point.

require(['use!Geosite',
         'esri/dijit/Popup'],
    function(N,
             Popup) {
    'use strict';

    var IDENTIFY_TIMEOUT = 5000,
        TIMEOUT_MESSAGE = i18next.t('Failed to return results within %f seconds', IDENTIFY_TIMEOUT / 1000),
        DEFAULT_WINDOW_WIDTH = 300,
        DEFAULT_WINDOW_HEIGHT = 600;


    N.doIdentify = function (view, pluginModels, event) {
        var map = view.esriMap,
            windowWidth = DEFAULT_WINDOW_WIDTH,
            windowHeight = DEFAULT_WINDOW_HEIGHT,
            infoWindow = createIdentifyWindow(view, map, event),
            // create an element for plugins to write their results into, or, if a timeout
            // occurs, for the framework to write a timeout message into.
            $resultsContainer = $('<div>').addClass('identify-results'),
            showIfLast = _.after(pluginModels.length, function () {
                showIdentifyResults(infoWindow, $resultsContainer, windowWidth, windowHeight);
            });

        // Accumulate results (probably asynchronously), and show them when all are accumulated
        pluginModels.each(function (pluginModel) {
            var clickPoint = { x: event.x, y: event.y },
                renderTimeout = function (args) {
                    var timeoutNotice = $('<div>').text(TIMEOUT_MESSAGE),
                        toolbarName = pluginModel.get('pluginObject').toolbarName;

                    appendIdentifyResult(toolbarName, timeoutNotice, $resultsContainer);
                },
                processResults = function processResults(args) {
                    if (args.result) {
                        appendIdentifyResult(args.pluginTitle, args.result, $resultsContainer);
                        if (args.width) { windowWidth = Math.max(windowWidth, args.width); }
                        if (args.height) { windowHeight = Math.max(windowHeight, args.height); }
                    }
                },
                processOrTimeout = N.timeoutWrapper({ success: processResults,
                                                      failure: renderTimeout,
                                                      executeOnce: showIfLast,
                                                      ms: IDENTIFY_TIMEOUT });

            pluginModel.identify(event.mapPoint, clickPoint, processOrTimeout);
        });

    };

    function appendIdentifyResult(pluginTitle, resultEl, $resultsContainer) {
        var template = N.app.templates['template-result-of-identify'],
            $html = $($.trim(template({ pluginTitle: pluginTitle })));
        $html.find('.identify-result').append(resultEl);
        $resultsContainer.append($html);
    }

    function createIdentifyWindow(view, map, event) {
        // Create a new info window
        var $infoWindow = $('<div>').addClass('identify-info-window').appendTo(view.$infoWindowParent),
            infoWindow = new esri.dijit.Popup({ map: map }, $infoWindow.get(0));

        map.infoWindow.destroy();
        map.infoWindow = infoWindow;
        infoWindow.resize(DEFAULT_WINDOW_WIDTH, DEFAULT_WINDOW_HEIGHT);
        infoWindow.setTitle(""); // without this call the title bar is hidden, along with its controls
        $infoWindow.find('.spinner').removeClass('hidden');
        infoWindow.show(event.mapPoint);
        return infoWindow;
    }

    function showIdentifyResults(infoWindow, $resultsContainer, width, height) {
        $(infoWindow.domNode).find('.spinner').addClass('hidden');
        if ($resultsContainer.children().length === 0) {
            $resultsContainer.append($('<div>').text(i18next.t('No information is available for this location.')));
        }
        infoWindow.resize(width, height);
        infoWindow.setContent($resultsContainer.get(0));

        if ($.i18n) {
            $(infoWindow.domNode).localize();
        }
    }

});
