define(function() {
    "use strict";

    // Schema for validating layers.config file (see http://json-schema.org)
    function schema() {
        return {
            $schema: 'http://json-schema.org/draft-04/schema#',
            type: 'array',
            items: { '$ref': '#/definitions/layer' },
            definitions: {
                'layer': layer(),
                'server': server()
            }
        };
    }

    function layer() {
        return {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: { type: 'string' },
                displayName: { type: 'string' },
                description: { type: 'string' },
                server: { '$ref': '#/definitions/server' },
                includeAllLayers: { type: 'boolean' },
                includeLayers: { type: 'array', items: { '$ref': '#/definitions/layer' } },
                excludeLayers: { type: 'array', items: { type: 'string' } },
                combine: { type: 'boolean' },
                opacity: { type: 'number' }
            }
        };
    }

    function server() {
        // None of these properties are required because missing values
        // may be inherited from parent server blocks.
        return {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: { type: 'string' },
                type: { enum: ['ags', 'wms'] },
                layerType: { enum: ['dynamic', 'tiled', 'feature-layer'] },
                url: { type: 'string' }
            }
        };
    }

    return schema();
});