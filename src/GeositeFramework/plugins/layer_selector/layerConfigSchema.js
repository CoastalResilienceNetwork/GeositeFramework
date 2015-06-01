// Module layerConfigSchema.js

define(function () {
    var layerConfigSchema = schema();
    return layerConfigSchema;

    // Schema for validating layers.config file (see http://json-schema.org)

    function schema() {
        return {
            $schema: 'http://json-schema.org/draft-04/schema#',
            title: 'layer_selector plugin: layer sources specification',
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    agsSource: agsSource(),
                    wmsSource: wmsSource()
                }
            }
        };
    }

    function agsSource() {
        return {
            type: 'object',
            additionalProperties: false,
            required: ['url'],
            properties: {
                url: { type: 'string' },
                availableInRegions: { type: 'array' },
                folderTitle: { type: 'string' },
                isNew: isNew(),
                folders: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['name'],
                        properties: {
                            url: { type: 'string' },
                            name: { type: 'string' },
                            displayName: { type: 'string' },
                            groupFolder: { type: 'string' },
                            groupAsService: { type: 'boolean' },
                            description: { type: 'string' },
                            isNew: isNew(),
                            services: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    additionalProperties: false,
                                    required: ['name', 'type'],
                                    properties: {
                                        name: { type: 'string' },
                                        displayName: { type: 'string' },
                                        type: { type: 'string' },
                                        opacity: { type: 'number' },
                                        visible: { type: 'boolean' },
                                        description: { type: 'string' },
                                        id: { type: 'string' },
                                        isNew: {
                                            type: 'object',
                                            additionalProperties: false,
                                            required: ["startDate", "endDate"],
                                            properties: {
                                                startDate: { type: 'string' },
                                                endDate: { type: 'string' },
                                                layerIds: { type: 'array', items: { type: 'integer' } },
                                            }
                                        },
                                        // Layers whitelist
                                        showLayers: {
                                            type: 'array',
                                            items: layer()
                                        },
                                        // Sparsely populated layer meta data that associates by id and parentLayerId
                                        layerMetadata: {
                                            type: 'array',
                                            items: layer()
                                        },
                                        visibleLayerIds: { type: 'array', items: { type: 'integer' } },
                                        displayLevels: { type: 'array', items: { type: 'integer' } },
                                        layerIndex: { type: 'integer' },
                                        mode: { type: 'string' },
                                        outFields: { type: 'array', items: { type: 'string' } },
                                        autoGeneralize: { type: 'boolean' },
                                        maxAllowableOffset: { type: 'boolean' },
                                        displayOnPan: { type: 'boolean' },
                                        layerDefinition: { type: 'string' },
                                        symbology: symbology()
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };
    }

    function layer() {
        return {
            type: 'object',
            additionalProperties: false,
            required: ['id'],
            properties: {
                id: { type: 'integer' },
                displayName: { type: 'string' },
                parentLayerId: { type: 'integer' },
                downloadUrl: { type: 'string' },
				visibleSubLayerIds:  { type: 'array', items: { type: 'integer' } } 
            }
        };
    }

    function isNew() {
        return {
            type: 'object',
            additionalProperties: false,
            required: ["startDate", "endDate"],
            properties: {
                startDate: { type: 'string' },
                endDate: { type: 'string' }
            }
        };
    }

    function symbology() {
        return {
            type: 'object',
            additionalProperties: false,
            properties: {
                fill: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        type: { type: 'string' },
                        style: { type: 'string' },
                        color: { type: 'array', items: { type: 'number' } },
                        outline: line(),
                        url: { type: 'string' },
                        height: { type: 'number' },
                        width: { type: 'number' },
                        offset: offset(),
                        xscale: { type: 'number' },
                        yscale: { type: 'number' }
                    }
                },
                line: line(),
                marker: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        type: { type: 'string' },
                        style: { type: 'string' },
                        color: { type: 'array', items: { type: 'number' } },
                        outline: line(),
                        url: { type: 'string' },
                        height: { type: 'number' },
                        width: { type: 'number' },
                        offset: offset(),
                        size: { type: 'integer' },
                        angle: { type: 'number' }
                    }
                }
            }
        };
    }

    function line() {
        return {
            type: 'object',
            additionalProperties: false,
            properties: {
                type: { type: 'string' },
                style: { type: 'string' },
                color: { type: 'array', items: { type: 'number' } },
                width: { type: 'number' },
                cap: { type: 'string' },
                miter: { type: 'string' },
                miterLimit: { type: 'string' }
            }
        };
    }

    function offset() {
        return {
            type: 'object',
            additionalProperties: false,
            properties: {
                x: { type: 'number' },
                y: { type: 'number' }
            }
        };
    }

    function wmsSource() {
        return {
            type: 'object',
            additionalProperties: false,
            required: ['url', 'folderTitle'],
            properties: {
                url: { type: 'string' },
                folderTitle: { type: 'string' },
                description: { type: 'string' },
                resourceInfo: { type: 'boolean' },
                groupFolder: { type: 'string' },
                opacity: { type: 'number' },
                isNew: isNew(),
                layerIds: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['name'],
                        properties: {
                            name: { type: 'string' },
                            displayName: { type: 'string' },
                            description: { type: 'string' },
                            isNew: isNew(),
                            downloadUrl: { type: 'string' },
                            extent: {
                                type: 'object',
                                additionalProperties: false,
                                required: ['xmin', 'ymin', 'xmax', 'ymax', 'sr'],
                                properties: {
                                    xmin: { type: 'number' },
                                    ymin: { type: 'number' },
                                    xmax: { type: 'number' },
                                    ymax: { type: 'number' },
                                    sr: { type: 'integer' }
                                }
                            }
                        }
                    }
                }
            }
        };
    }

});