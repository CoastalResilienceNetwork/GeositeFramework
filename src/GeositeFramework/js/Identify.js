/*jslint nomen:true, devel:true */
/*global _, $, Geosite, dojo, esri */

// Adds the 'Identify' feature to the map view.
// Identify allows the user to click on a point on the map
// and ask each active plugin to return any relevant information
// about that point.

(function (N) {
    N.doIdentify = function (view, pluginModels, event) {
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
    };

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

}(Geosite));
