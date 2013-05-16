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
            _$templates = $('<div>').append($(templates.trim())),
            _$container,
            _$select,
            _$requestButton,
            _layer,
            _editbar,
            _currentFeature,        // Keep state of report runs for
            _currentReport,         // getState() requests
            _gp;
        dojo.require("esri.toolbars.draw");
        dojo.require("esri.tasks.gp");
        
        function getTemplate(name) {
            var template = _.template(_$templates.find('#' + name).html().trim());
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

            $body.find("#report-plugin-draw").click(handleStartDraw);
            _$requestButton = $body.find("#report-plugin-request").click(function() {
                requestReport(_$select.val());
            });
            
            return $body;
        }
        
        function handleStartDraw() {
            _$requestButton.attr("disabled", "disabled");
            _editbar.activate(esri.toolbars.Draw.POLYGON);
        }
        
        function requestReport(reportIdx) {
            var featureSet = new esri.tasks.FeatureSet(),
                report = _config.reports[reportIdx];

            featureSet.features = [_currentFeature];
            _currentReport = report.id;
            
            var params = {
                "Layers": JSON.stringify(report.layers),
                "Clip": featureSet
            };
            _gp.submitJob(params, gpFinished, null, function (error) {
                this.app.error("Unable to process Report Analysis", error);
            });
        }
        
        function gpFinished(info) {
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
        
        function handleReportResult(result) {
            // TODO: View Results
            console.log(result.value);
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
        
        function initialize(context) {
            var self = context,
                $desc;

            _gp = new esri.tasks.Geoprocessor(_config.gpUrl);

            _$container = $(self.container).append(render(_config.reports));

            // Set the selected report description
            $desc = _$container.find("#report-plugin-report-description");
            _$container.on('change', 'select', function () {
                $desc.html(_config.reports[$(this).val()].description);
            });

            _layer = new esri.layers.GraphicsLayer({ id: "analysis-draw" });
            self.map.addLayer(_layer);

            _editbar = new esri.toolbars.Draw(self.map);
            dojo.connect(_editbar, "onDrawEnd", addGraphic);
        }
        
        return declare(PluginBase, {
            toolbarName: "Analysis",
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
                if (_currentFeature && _currentReport) {
                    return {
                        feature: _currentFeature.geometry.toJson(),
                        report: _currentReport
                    };
                }
                return null;
            }
        });
    }
);