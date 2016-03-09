define([
        "underscore",
        "framework/unittest",
        "../LayerNode"
    ],
    function(_,
             unittest,
             LayerNode) {
        "use strict";

        var assertTrue = unittest.assertTrue;

        unittest.runAllTests([
            function testLayerNodeId() {
                var layer = LayerNode.fromJS({
                    name: 'foo',
                    includeLayers: [
                        { name: 'bar' }
                    ]
                });
                assertTrue(layer.id() === 'foo');
                assertTrue(layer.getChildren()[0].id() === 'foo/bar');
            },

            function testWhitelist() {
                var parent1 = LayerNode.fromJS({
                    name: 'parent1',
                    includeAllLayers: true
                });
                assertTrue(parent1.canAddChild(new LayerNode({ name: 'foo' })));
                assertTrue(parent1.canAddChild(new LayerNode({ name: 'bar' })));

                var parent2 = LayerNode.fromJS({
                    name: 'parent2',
                    includeLayers: [
                        { name: 'foo' }
                    ]
                });
                assertTrue(parent2.canAddChild(new LayerNode({ name: 'foo' })));
                assertTrue(!parent2.canAddChild(new LayerNode({ name: 'bar' })));
            },

            function testBlacklist() {
                // Can't add children unless `includeAllLayers`, `includeLayers`,
                // or `excludeLayers` is specified.
                var parent1 = LayerNode.fromJS({ name: 'parent1' });
                assertTrue(!parent1.canAddChild(new LayerNode({ name: 'foo' })));
                assertTrue(!parent1.canAddChild(new LayerNode({ name: 'bar' })));

                var parent2 = LayerNode.fromJS({
                    name: 'parent2',
                    excludeLayers: ['bar']
                });
                assertTrue(parent2.canAddChild(new LayerNode({ name: 'foo' })));
                assertTrue(!parent2.canAddChild(new LayerNode({ name: 'bar' })));
            },

            function testServiceUrl() {
                var parent = LayerNode.fromJS({
                    name: 'foo',
                    server: {
                        type: 'ags',
                        url: 'http://service/'
                    },
                    includeLayers: [
                        {
                            name: 'bar',
                            server: {
                                name: 'xyz'
                            }
                        }
                    ]
                });
                var child = parent.findLayer('foo/bar');
                assertTrue(child.getService().getServiceUrl() === 'http://service/xyz/MapServer');
            }
        ]);
    }
);
