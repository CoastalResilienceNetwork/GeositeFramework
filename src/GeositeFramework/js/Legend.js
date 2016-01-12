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
                self.$el.hide();
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
            _.each(legendGroups, function(legendGroup) {
                var service = legendGroup.service,
                    layer = legendGroup.layer,
                    legend = legendGroup.legend,
                    tmpl = self.getLayerTemplate(legend, service, layer);
                    $container.append(tmpl(legend));
            });
            this.$el.find('.legend-body').html($container.html());
        }
    });

    return Legend;
});