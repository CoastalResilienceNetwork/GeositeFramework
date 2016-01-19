define(['use!Geosite',
         'dojo/_base/declare',
         'dojox/layout/ResizeHandle',
         'framework/widgets/ConstrainedMoveable'
        ],
    function(N,
             declare,
             ResizeHandle,
             ConstrainedMoveable) {
    'use strict';

    var LegendConfig = declare(null, {
        constructor: function(regionData) {
            this.config = regionData.legend;
        },

        getLayerSettings: function(service, layer) {
            if (this.config.layers) {
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

            this.$el.find('.legend-close').click(function() {
                self.toggleMinimize();
            });
        },

        getLayerTemplate: function(legend, service, layer) {
            var layerSettings = this.config.getLayerSettings(service, layer);

            if (layerSettings) {
                if (layerSettings.legendType === 'single') {
                    return this.tmplLegendItemSingle;
                } else if (layerSettings.legendType === 'multiple') {
                    return this.tmplLegendItemMultiple;
                } else if (layerSettings.legendType === 'scale') {
                    return this.tmplLegendItemScale;
                }
            }

            if (legend.legend.length === 1) {
                return this.tmplLegendItemSingle;
            }

            return this.tmplLegendItemMultiple;
        },

        render: function(legendGroups) {
            var self = this,
                $container = $('<div>');
                
            if (legendGroups.length === 0) {
                this.$el.hide();
            } else {
                this.$el.show();
            }

            _.each(legendGroups, function(legendGroup) {
                var service = legendGroup.service,
                    layer = legendGroup.layer,
                    legend = legendGroup.legend,
                    tmpl = self.getLayerTemplate(legend, service, layer);

                $container.append(tmpl(legend));
            });

            this.$el.find('.legend-body').html($container.html());
            this.assignLegendEvents();
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

            this.$el.removeClass('minimized');
        },

        _calcDimensions: function() {
            var top = parseInt(this.$el.css('top')),
                headerHeight = parseInt(this.$el.find('.legend-header').css('height'));

            return {
                top: top,
                headerHeight: headerHeight
            };
        }
    });

    return Legend;
});