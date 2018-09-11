define(['use!Geosite',
         'dojo/_base/declare',
         'dojo/window',
         'dojo/dom-geometry',
         'dojox/layout/ResizeHandle',
         '../js/widgets/ConstrainedMoveable.js'
        ],
    function(N,
             declare,
             win,
             domGeom,
             ResizeHandle,
             ConstrainedMoveable) {
    'use strict';

    var LegendConfig = declare(null, {
        constructor: function(regionData) {
            this.config = regionData.legend;
        },

        getLayerSettings: function(service, layer) {
            if (this.config && this.config.layers) {
                return _.findWhere(this.config.layers, {
                    serviceUrl: service.url,
                    layerName: layer.name
                });
            }

            return null;
        }
    });

    var Legend = declare(null, {
        constructor: function(regionData, id) {
            var self = this;

            this.$el = $('#' + id);
            this.config = new LegendConfig(regionData);
            this.tmplLegendItemSingle = _.template($('#template-legend-item-single').html());
            this.tmplLegendItemMultiple = _.template($('#template-legend-item-multiple').html());
            this.tmplLegendItemScale = _.template($('#template-legend-item-scale').html());
            this.tmplLegendItemImage = _.template($('#template-legend-item-image').html());

            // Make the legend resizeable and moveable
            var handle = new ResizeHandle({
                targetId: id,
                activeResize: true,
                animateSizing: false
            });

            handle.placeAt(id);

            new ConstrainedMoveable(
                document.getElementById(id), {
                    handle: this.$el.find('.legend-header')[0],
                    within: true
                });

            this.$el.find('.legend-close').bind('click touchstart', function() {
                self.toggleMinimize();
            });
        },

        getLayerTemplate: function(legend, service, layer) {
            // Exclude layers from legend if they begin with an _
            if (layer.name[0] === '_'){ 
                return null; 
            }

            // Not all layers have legends.
            if (!legend) {
                return null;
            }

            var layerSettings = this.config.getLayerSettings(service, layer);

            if (layerSettings) {
                if (layerSettings.legendType === 'single') {
                    return this.tmplLegendItemSingle;
                } else if (layerSettings.legendType === 'multiple') {
                    return this.tmplLegendItemMultiple;
                } else if (layerSettings.legendType === 'scale') {
                    return this.tmplLegendItemScale;
                } else if (layerSettings.legendType === 'image') {
                    return this.tmplLegendItemImage;
                }
            }

            // A string indicates we have a legend URL that returns an image
            // instead of a JSON representation
            if (typeof legend === 'string') {
                return this.tmplLegendItemImage;
            } else if (legend.legend.length === 1) {
                return this.tmplLegendItemSingle;
            }

            return this.tmplLegendItemMultiple;
        },

        getCustomLegendCount: function() {
            return this.$el.find('.plugin-legends')
                .children()
                .not('[style="display: none;"]')
                .not(':empty')
                .length;
        },

        render: function(legendGroups) {
            var self = this,
                $container = $('<div>');

            if (legendGroups.length === 0 && this.getCustomLegendCount() === 0) {
                this.$el.hide();
            } else {
                this.$el.show();
            }

            _.each(legendGroups, function(legendGroup) {
                var service = legendGroup.service,
                    layer = legendGroup.layer,
                    legend = legendGroup.legend,
                    tmpl = self.getLayerTemplate(legend, service, layer);

                if (tmpl) {
                    if (typeof legend === 'string') {
                        $container.append(tmpl({ legend: legend, layer: layer }));
                    } else {
                        $container.append(tmpl(legend));
                    }

                    if ($.i18n) {
                        $container.localize();
                    }
                }
            });

            this.$el.find('.legend-body .layer-legends').html($container.html());
            this.assignLegendEvents();

            if (!this.$el.hasClass('minimized')) {
                this.autoResize();
            }
        },

        assignLegendEvents: function() {
            this.$el.find('.expand-legend').on('click', $.proxy(function(e) {
                this.toggleExtraLegendItems(e);
            }, this));
        },

        toggleExtraLegendItems: function(e) {
            var $extraLegendControl = $(e.target),
                $extraLegendItems = $extraLegendControl.parents('.legend-layer');

            $extraLegendItems.toggleClass('show-extras');
        },

        toggleMinimize: function() {
            if (this.$el.hasClass('minimized')) {
                this.restore();
                this.autoResize();
            } else {
                this.minimize();
            }
        },

        minimize: function() {
            var dims = this._calcDimensions(),
                // An element with a ResizeHandle gets an inlined height
                // once it's been resized, so we have to hold on these
                // values so we can restore them later.
                height = this.height = parseInt(this.$el.css('height')),
                // We need to move the header to where the bottom of the legend
                // was so that the header doesn't look like it's floating.
                top = dims.top + height - dims.headerHeight;

            this.$el.css({
                height: 0,
                top: top
            });

            // Hide the legend body or else it maintains it's
            // height despite the above css changes.
            this.$el.find('.legend-body').hide();

            // Toggle the text of the minimize button
            this.$el.find('.legend-close')
                .attr({title: 'Restore Legend'})
                .text('+');

            // Hide the resize handle or else the user can resize the
            // minimized legend.
            this.$el.find('.dojoxResizeHandle').hide();

            this.$el.addClass('minimized');
        },

        restore: function() {
            // If the legend was dragged while minimized,
            // the value of top may have changed.
            var dims = this._calcDimensions(),
                // We need to move the header to where it was previously.
                // Without this math, the element will slowly creep upward
                // after toggling. We also have to protect against the header
                // going under the app title bar.
                calculatedTop = dims.top - this.height + dims.headerHeight,
                top = calculatedTop < 0 ? 0 : calculatedTop;

            this.$el.css({
                height: this.height,
                top: top
            });

            this.$el.find('.legend-body').show();
            this.$el.find('.dojoxResizeHandle').show();

            // Toggle the text of the minimize button
            this.$el.find('.legend-close')
                .attr({title: 'Hide Legend'})
                .text('_');

            this.$el.removeClass('minimized');
        },

        _calcDimensions: function() {
            var top = parseInt(this.$el.css('top')),
                headerHeight = parseInt(this.$el.find('.legend-header').css('height'));

            return {
                top: top,
                headerHeight: headerHeight
            };
        },

        autoResize: function() {
            // Attempts to resize the legend element to more
            // conveniently  display (i.e. no scrollbar) the layer
            // legends. It will do so until the hard-coded limits
            // here are reached.
            var MAX_HEIGHT = 400, // Somewhat arbitrary
                MAX_WIDTH = 255, // Just enough to fit one column
                MIN_WIDTH = 255, // Just enough to fit one column
                LEGEND_BODY_PADDING = 22;

            // We use $el.css('property') instead of $el.property() in most
            // cases because it returns a more accurate number. I think this
            // is due to inline style rules.
            var legend = this.$el,
                contentHeight = LEGEND_BODY_PADDING,
                contentWidth = parseInt(legend.find('.legend-body').css('width')),
                legendHeaderHeight = this._calcDimensions().headerHeight,
                legendHeight = parseInt(legend.outerHeight()) - legendHeaderHeight,
                legendWidth = parseInt(legend.css('width'));

            // Add up the height of the all of the layer legends and plugin legends.
            legend.find('.legend-body .legend-layer, .legend-body .custom-legend')
                    .filter(':visible')
                    .each(function(i, el) {
                        // True indicates margin should be included.
                        contentHeight += $(el).outerHeight(true);
                    });

            // Height
            if (contentHeight != legendHeight && legendHeight < MAX_HEIGHT) {
                if (contentHeight < MAX_HEIGHT) {
                    legend.css({ height: (contentHeight + legendHeaderHeight) });
                } else if (contentHeight > MAX_HEIGHT) {
                    legend.css({ height: MAX_HEIGHT });
                }
            }

            // Width
            if (legendHeight <= MAX_HEIGHT) {
                if (contentHeight > MAX_HEIGHT && legendWidth < MAX_WIDTH) {
                    legend.css({ width: MAX_WIDTH });
                } else if (contentHeight < MAX_HEIGHT) {
                    legend.css({ width: MIN_WIDTH });
                }
            }

            // If the legend was minimized or moved by the user,
            // it's possible that resizing it will push part of
            // the element off the screen.
            this.checkAndSetPosition();
        },

        checkAndSetPosition: function() {
            // Checks if the legend is outside of the viewport on
            // the bottom and right sides. If so, the legend is
            // repositioned to be completely in the viewport, plus
            // a small buffer so that it's not flush with the edge.
            var VIEWPORT_BUFFER = 30;

            var viewportSize = win.getBox(),
                legend = this.$el,
                legendDimensions = domGeom.position(legend.attr('id')),
                legendRight = legendDimensions.x + legendDimensions.w,
                legendBottom = legendDimensions.y + legendDimensions.h;

            if (legendRight > viewportSize.w) {
                var currentLeft = parseInt(legend.css('left')),
                    newLeft = (currentLeft - (legendRight - viewportSize.w)) - VIEWPORT_BUFFER;

                legend.css({ left: newLeft });
            }

            if (legendBottom > viewportSize.h) {
                var currentTop = parseInt(legend.css('top')),
                    newTop = (currentTop - (legendBottom - viewportSize.h)) - VIEWPORT_BUFFER;

                legend.css({ top: newTop });
            }
        }
    });

    return Legend;
});