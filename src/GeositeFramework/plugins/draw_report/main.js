// "Draw and Report" plugin, main module


// Plugins should load their own versions of any libraries used even if those libraries are also used 
// by the GeositeFramework, in case a future framework version uses a different library version. 

require({
    // Specify library locations.
    packages: [
        {
            name: "jquery",
            location: "//ajax.googleapis.com/ajax/libs/jquery/1.9.0",
            main: "jquery.min"
        },
        {
            name: "underscore",
            location: "//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.4.4",
            main: "underscore-min"
        }
    ]
});

define(
    ["dojo/_base/declare", "framework/PluginBase", "dojo/text!plugins/draw_report/templates.html",
        "dojo/text!plugins/draw_report/reports_config.json"],
    function (declare, PluginBase, templates, config) {

        var _config = $.parseJSON(config),
            _$templates = $('<div>').append($($.trim(templates))),
            _$select,
            _$requestButton,
            _$resultDisplay,
            _$resultTab,
            _layer,
            _editbar,
            _currentFeature,        // Keep state of report runs for
            _currentReportId,       // getState() requests
            _gp,            showSpinner, hideSpinner;
        dojo.require("esri.toolbars.draw");
        dojo.require("esri.tasks.gp");
        
        function getTemplate(name) {
            var template = _.template($.trim(_$templates.find('#' + name).html()));
            return template;
        }

        function render(reports) {
            var bodyTemplate = getTemplate("template-report-pluginbody"),
                optionTemplate = getTemplate("template-report-select-option"),
                $body = $(bodyTemplate({firstDescription: reports[0].description})),
                rendered = _.map(reports, function (report, index) {
                    report.index = index;
                    return optionTemplate(report);
                });

            _$select = $body.find("select");
            _$select.append.apply(_$select, rendered);

            _$resultDisplay = $body.find("#report-plugin-tab-result");
            _$resultTab = $body.find('#plugin-report-result-tab');
            
            $body.find("#report-plugin-draw").click(handleStartDraw);
            _$requestButton = $body.find("#report-plugin-request").click(function() {
                requestReport(_$select.val());
            });
            
            return $body;
        }
        
        function handleStartDraw() {
            _layer.clear();
            _$requestButton.attr("disabled", "disabled");
            _editbar.activate(esri.toolbars.Draw.POLYGON);
        }
        
        function requestReport(reportIdx) {
            var featureSet = new esri.tasks.FeatureSet(),
                report = _config.reports[reportIdx],
                params;

            featureSet.features = [_currentFeature];
            _currentReportId = report.id;
            
            params = {
                "Layers": JSON.stringify(report.layers),
                "Clip": featureSet
            };

            showSpinner();
            _gp.submitJob(params, gpFinished, null, function (error) {
                this.app.error("Unable to process Report Analysis", error);
            });
        }
        
        function gpFinished(info) {
            hideSpinner();
            if (info.jobStatus === 'esriJobSucceeded') {
                _gp.getResultData(info.jobId, "Output", handleReportResult);
            } else {
                var messages = _.reduce(info.messages,
                    function(prev, message) {
                        return prev += message.description + " \n";
                    }, "");
                this.app.error("Unable to process Report Analysis", messages);
            }
        }
        
        function spinner($container, action) {
            var $spinner = $container.find(".plugin-report-spinner ");
            return function () {
                $spinner[action]();
            };
        }
        
        function handleReportResult(result) {
            var report = _.find(_config.reports, function(r) {
                    return r.id === _currentReportId;
                }),
                // The layer results are in the same order as they are config'd
                layerResults = _.zip(result.value, report.layers),
                context = {
                    name: report.name,
                    layers: layerResults
                };

            _$resultDisplay.empty()
                .append(getTemplate("template-report-results")(context));
            _$resultTab.click();
        }

        function addGraphic(geometry) {
            // Only 1 graphic at a time
            var symbol = new esri.symbol.SimpleFillSymbol();
            _currentFeature = new esri.Graphic(geometry, symbol);
            _layer.clear();
            _layer.add(_currentFeature);
            _$requestButton.removeAttr("disabled");
            _editbar.deactivate();
        }
        
        // Quick and dirty tab switcher without adding content
        // to the browser hash (foundation does) which breaks hash models
        function setupViewTabs($tabHost) {
            var $tabContent = $tabHost.find('.tabs-content'),
                $tabs = $tabHost.find('.tabs');
            
            $tabHost.on("click", "dl.tabs a", function() {
                var $tab = $(this);
                $tabContent.find('li').removeClass('active');
                $tabs.find('dd').removeClass('active');
                
                $tab.parent().addClass('active');
                $tabContent.find('#' + $tab.data('content')).addClass('active');
            });
        }
        
        function initialize(context) {
            var self = context,
                $container,
                $desc;

            _gp = new esri.tasks.Geoprocessor(_config.gpUrl);

            $container = $(self.container).append(render(_config.reports));
            setupViewTabs($container);
            
            // Set the selected report description
            $desc = $container.find("#report-plugin-report-description");
            $container.on('change', 'select', function () {
                $desc.html(_config.reports[$(this).val()].description);
            });

            showSpinner = spinner($container, "show");
            hideSpinner = spinner($container, "hide");
            hideSpinner();
            
            _layer = new esri.layers.GraphicsLayer({ id: "analysis-draw" });
            self.map.addLayer(_layer);

            _editbar = new esri.toolbars.Draw(self.map);
            dojo.connect(_editbar, "onDrawEnd", addGraphic);
        }
        
        return declare(PluginBase, {
            toolbarName: "Draw & Report",
            fullName: "Analyze a specific region of the map",
            toolbarType: "sidebar",
            allowIdentifyWhenActive: false,
            showServiceLayersInLegend: false,
            
            initialize: function (args) {
                declare.safeMixin(this, args);
                initialize(this);
            },
            
            deactivate: function() {
                _editbar.deactivate();
            },
            
            hibernate: function() {
                this.deactivate();
                this._currentFeature = null;
                _layer.clear();
                _$requestButton.attr("disabled", "disabled");
            },
            
            setState: function(state) {
                var report,
                    selectedIndex;
                _.each(_config.reports, function (r, i) {
                    if (state.report === r.id) {
                        report = r;
                        selectedIndex = i;
                    };
                });
                
                if (report && state.feature) {
                    var stateGeom = esri.geometry.fromJson(state.feature);
                    addGraphic(stateGeom);
                    _$select.val(selectedIndex);
                    requestReport(selectedIndex);
                }
            },
            
            getState: function () {
                if (_currentFeature && _currentReportId) {
                    return {
                        feature: _currentFeature.geometry.toJson(),
                        report: _currentReportId
                    };
                }
                return null;
            }
        });
    }
);
