﻿
define([],
    function () {

        ////////////////////////////////
        // TEMPLATES
        ////////////////////////////////

        var inputTemplate = ['<input type="text" placeholder="Search by Address" value="<%= inputValue %>" />',
                             '<div id="pluginZoomTo-clearSearch">&#10006;</div>',
                             '<div id="pluginZoomTo-choices"></div>'
                             ].join("");
            locationTemplate = '<a href="javascript:;"><%= address %></a>',
            searchErrorText = "There was an error completing your request.";


        ////////////////////////////////
        // MODEL CLASS
        ////////////////////////////////

        var UiInput = Backbone.Model.extend({

            defaults: {
                // set by view, listened internally
                inputValue: "",
                hasMouse: false,
                hasFocus: false,

                // set internally, listened by view
                showingInput: false,
                showingLocationBox: false,
                addressCandidates: [],
                addressError: false,

            },

            initialize: function () {
                // Manage the state of some attributes based on the value
                // of other attributes. The view sets some simple attributes
                // and the other managed based on the state of the model
                // at the time of change.

                var model = this;

                // a private member used to access ajax requests
                // that are in progress.
                model._activeRequest = null;


                this.on("change:inputValue", function () {
                    model.set('addressCandidates', []);
                    model.set('addressError', false);
                    model.abortGeocodeRequest();

                    if (model.get('inputValue') === "") {
                        model.set('showingInput', false);
                        model.set('showingLocationBox', false);
                    } else {
                        model.set('showingInput', true);

                    }
                });

                this.on("change:hasMouse change:hasFocus", function () {
                    if (model.get('hasMouse') === true || 
                        model.get('hasFocus') === true || 
                        model.get('inputValue') !== "") {
                        model.set('showingInput', true);
                    } else {
                        model.set('showingInput', false);
                    }
                });
            },

            setupLocator: function (url, map, zoomLevel, pointConstructor) {
                // After the map is finished loading, the plugin will
                // call this method and provide these values. This
                // object is needed to geocode and to plot points.

                this.locator = {
                    url: url,
                    map: map,
                    zoomLevel: zoomLevel,
                    point: pointConstructor
                };
            },

            abortGeocodeRequest: function () {
                // helper method to abort any active ajax requests
                // to make sure that there is only one in the pipeline.
                // This is a separate method because it can be called:
                // 1) When a new request is made.
                // 2) When the input box is cleared.
                
                if (this._activeRequest !== null) {
                    this._activeRequest.abort();
                } else {
                    this._activeRequest = null;
                }
            },


            geocodeAddress: function () {
                // Make an ajax request to the geocoder URL provided by 
                // the plugin conf. Returns an array of candidates with
                // latlng values on success, an error on failure.

                var model = this,
                    singleLine =  this.get('inputValue'),
                    url = [this.locator.url, "SingleLine=",
                           singleLine, "&outFields=&outSR=&f=pjson&callback=?"
                           ].join("");

                model.abortGeocodeRequest();

                model.set('showingLocationBox', true);

                model._activeRequest = $.jsonp({ 
                    url: url,
                    timeout: 12000,
                    success: function (results) { 
                        if (results.candidates.length > 0) {
                            model.set('addressCandidates', results.candidates); 
                        } else {
                            model.set('addressError', true);
                        }
                    },
                    error: function (error) { model.set('addressError', true); }
                });
            }
        });


        ////////////////////////////////
        // VIEW CLASS
        ////////////////////////////////

        var UiInputView = Backbone.View.extend({

            className: "pluginZoomTo",

            events: {
                // Because this plugin renders some extra UI features into
                // the <a> tag used as the plugin icon, click events do not
                // behave quite as expected. For example, A click event on 
                // the plugin will try to take focus, but the subsequent
                // click event that registers on the <a> tag will rerender
                // the dom elements and lose focus. Therefore, for this plugin
                // and plugins that behave similarly, ALL click events must
                // manually stop event propation up to the <a> tag.

                "click div#pluginZoomTo-clearSearch": function (e) {
                    this.model.set('inputValue', "");
                    e.stopPropagation(); // required for ALL click events
                },
                "click input": function (e) {
                     e.stopPropagation(); // required for ALL click events
                },
                "mouseenter": function () { this.model.set('hasMouse', true); },
                "mouseleave": function () { this.model.set('hasMouse', false); },
                "blur input": function () { this.model.set('hasFocus', false); },
                "focus input": function () { this.model.set('hasFocus', true); },
                "keyup input": function (event) { this.handleKeyPress(event); }
            },

            buildCandidateEvents: function () {

                var candidates = this.model.get("addressCandidates"),
                    view = this,
                    $wrapHtml = function (candidate) {
                        // take a location candidate and build a dom fragment
                        // and click event to center and zoom over the candidate's
                        // geopoint.

                        var x = candidate.location.x,
                            y = candidate.location.y,
                            $fragment = $(_.template(locationTemplate)({ 
                                address: candidate.address,
                                x: x,
                                y: y
                            }));
                        $fragment.click(function(e) {
                            view.centerAndZoom(x, y);
                            // Don't bubble the click up to the plugin launcher
                            e.stopPropagation();
                        });
                        return $fragment;
                    };
                
                    return _.map(candidates, $wrapHtml);
            },

            renderLocationBox: function (content) {
                this.$("#pluginZoomTo-choices")
                    .empty()
                    .append(content);
            },

            centerAndZoom: function (x, y) {
                var point = this.model.locator.point(x, y);
                this.model.locator.map.centerAndZoom(point, this.model.locator.zoomLevel);
            },

            handleKeyPress: function (event) {
                this.model.set("inputValue", this.$("input").val());

                var keycode = (event.keyCode ? event.keyCode : null);
                if (keycode === 13) {
                    this.model.geocodeAddress();
                }
            },

            initialize: function () {
                var view = this;

                this.listenTo(this.model, "change:showingInput change:showingLocationBox", function () {
                    if (view.model.get('showingInput') === true && view.model.get('showingLocationBox') === true) {
                        view.$el.addClass("pluginZoomTo-showing-input");
                        view.$el.addClass("pluginZoomTo-with-choices");
                        view.$('#pluginZoomTo-choices').empty();
                        view.$('#pluginZoomTo-choices').append(
                            '<div class="pluginZoomTo-progressIndicator"></div>');
                    } else if (view.model.get('showingInput') === true) {
                        view.$el.addClass("pluginZoomTo-showing-input");
                        view.$el.removeClass("pluginZoomTo-with-choices");
                    } else if (view.model.get('showingInput') === true && view.model.get('showingLocationBox') === false) {
                        // This is just a test embedded in the code.
                        // TODO: move to unit tests or remove entirely
                        console.log("Error. Can't show location box without input");
                    } else {
                        view.$('input').val("");
                        view.$el.removeClass("pluginZoomTo-showing-input");
                        view.$el.removeClass("pluginZoomTo-with-choices");
                    }
                });

                this.listenTo(this.model, "change:addressCandidates change:addressError", function () {
                    if (view.model.get('addressError') === true) {
                        view.renderLocationBox(searchErrorText);
                    } else if (view.model.get('addressCandidates') !== []) {
                        view.renderLocationBox(view.buildCandidateEvents());
                    }
                });
            },

            render: function () {
                var renderedTemplate = _.template(inputTemplate)(this.model.toJSON());
                this.$el
                    .empty()
                    .append(renderedTemplate);
                return this;
            }
        });

        // This enables the plugin to use these backbone classes
        return { UiInput: UiInput, UiInputView: UiInputView };
        
    });
