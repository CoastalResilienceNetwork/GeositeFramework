
define([],
    function () {

        ////////////////////////////////
        // TEMPLATES
        ////////////////////////////////

        var inputTemplate = ['<input type="text" placeholder="Search by Address" value="<%= inputValue %>" />',
                             '<div id="search-box-choices"></div>'
                             ].join("");
            locationTemplate = '<a href="#"><%= address %></a> (<%= x %>, <%= y %>)<br>';


        ////////////////////////////////
        // MODEL CLASS
        ////////////////////////////////

        var UiInput = Backbone.Model.extend({

            defaults: {
                // set by view, listened internally
                inputValue: "", // changed only when enter is pressed
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

                var that = this;
                this.on("change:inputValue", function () {
                    if (that.get('inputValue') === "") {
                        that.set('showingInput', false);
                        that.set('showingLocationBox', false);
                    } else {
                        that.set('showingInput', true);
                        that.set('showingLocationBox', true);
                        that.geocodeAddress();
                    }
                });

                this.on("change:hasMouse change:hasFocus", function () {
                    if (that.get('hasMouse') || that.get('hasFocus') || that.get('inputValue')) {
                        that.set('showingInput', true);
                    } else {
                        that.set('showingInput', false);
                    }
                });
            },

            setupLocator: function (url, map, zoomLevel) {
                // After the map is finished loading, the plugin will
                // call this method and provide these values. This
                // object is needed to geocode and to plot points.

                this.locator = {
                    url: url,
                    map: map,
                    zoomLevel: zoomLevel,
                    spatialReference: new esri.SpatialReference({ wkid: 4326 /* lat-lng */ })
                }
            },

            geocodeAddress: function () {
                // Make an ajax request to the geocoder URL provided by 
                // the plugin conf. Returns an array of candidates with
                // latlng values on sucess, an error on fealure.

                var that = this;
                    singleLine =  this.get('inputValue'),
                    url = [this.locator.url, "SingleLine=",
                           singleLine, "&outFields=&outSR=&f=pjson"
                           ].join("");
                
                $.ajax({ dataType: "jsonp", url: url })
                    .done(function (results) {
                        that.set('addressCandidates', results.candidates);
                        })
                    .error(function (error) {
                        // TODO: handle this error.
                        that.set('addressError', true);
                    });
            }
        });


        ////////////////////////////////
        // VIEW CLASS
        ////////////////////////////////

        var UiInputView = Backbone.View.extend({

            className: "search-box",

            events: {
                "mouseenter": function () { this.model.set('hasMouse', true); },
                "mouseleave": function () { this.model.set('hasMouse', false); },
                "blur input": function () { this.model.set('hasFocus', false); },
                "focus input": function () { this.model.set('hasFocus', true); },
                "keyup input": function (event) { this.handleKeyPress(event); }
            },

            renderLocationBox: function () {

                var candidates = this.model.get("addressCandidates"),
                    that = this,
                    $domElement = that.$("#search-box-choices"),
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
                        $fragment.click(function () { that.centerAndZoom(x, y); });
                        return $fragment
                    };

                // TODO: append a "Clear Results" link.
                $domElement
                    .empty()
                    .append(_.map(candidates, $wrapHtml));
            },

            centerAndZoom: function (x, y) {
                // helper method so that other objects can
                // tell the view to clear its input instead
                // of accessing its members directly.
                // thin wrapper around esri's map's center
                // and zoom.

                var point = new esri.geometry.Point(x, y, this.model.locator.spatialReference);
                this.model.locator.map.centerAndZoom(point, this.model.locator.zoomLevel);
                this.$("#search-box-choices").empty();
                this.$('input').val("");
                this.model.set('inputValue', "");
            },

            handleKeyPress: function (event) {
                // Set the input value only when enter is pressed

                var keycode = (event.keyCode ? event.keyCode : null);
                if (keycode == '13') {
                    this.model.set("inputValue", this.$("input").val());
                }
            },

            initialize: function () {
                var that = this;

                this.listenTo(this.model, "change:showingInput change:showingLocationBox", function () {
                    if (that.model.get('showingInput') === true && that.model.get('showingLocationBox') == true) {
                        that.$el.addClass("search-box-showing-input");
                        that.$el.addClass("search-box-with-choices");
                    } else if (that.model.get('showingInput') === true) {
                        that.$el.addClass("search-box-showing-input");
                        that.$el.removeClass("search-box-with-choices");
                    } else if (that.model.get('showingInput') == true && that.model.get('showingLocationBox') === false) {
                        alert("Error. Can't show location box without input");
                    } else {
                        that.$('input').val("");
                        that.$el.removeClass("search-box-showing-input");
                        that.$el.removeClass("search-box-with-choices");
                    }
                });

                this.listenTo(this.model, "change:addressCandidates change:addressError", function () {
                    if (that.model.get('addressError')) {
                        // TODO: add error handling.
                        // Unfortunately, errors never seem to happen
                        // because the request doesn't timeout for bad
                        // data, it just never returns.
                    } else {
                        that.renderLocationBox();
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
