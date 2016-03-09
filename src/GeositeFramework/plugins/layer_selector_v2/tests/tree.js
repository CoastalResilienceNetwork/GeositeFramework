define([
        "underscore",
        "framework/unittest",
        "../LayerNode",
        "../State",
        "../Tree"
    ],
    function(_,
             unittest,
             LayerNode,
             State,
             Tree) {
        "use strict";

        var assertTrue = unittest.assertTrue;

        function makeTree() {
            var layers = [
                    LayerNode.fromJS({
                        name: 'foo',
                        includeLayers: [
                            {
                                name: 'bar',
                                opacity: 0.5,
                                availableInRegions: ['main']
                            },
                            {
                                name: 'baz',
                                availableInRegions: ['baz']
                            },
                            {
                                name: 'bat'
                            }
                        ]
                    })
                ];
            return new Tree(layers);
        }

        unittest.runAllTests([
            function testStateUpdate() {
                var tree = makeTree(),
                    state = new State();

                assertTrue(!tree.findLayer('foo').isExpanded());
                tree = tree.update(state.expandLayer('foo'));
                assertTrue(tree.findLayer('foo').isExpanded());

                assertTrue(!tree.findLayer('foo/bar').isSelected());
                tree = tree.update(state.selectLayer('foo/bar'));
                assertTrue(tree.findLayer('foo/bar').isSelected());

                assertTrue(tree.findLayer('foo').getOpacity() === 1);
                assertTrue(tree.findLayer('foo/bar').getOpacity() === 0.5);
                tree = tree.update(state.setLayerOpacity('foo/bar', 0));
                assertTrue(tree.findLayer('foo/bar').getOpacity() === 0);
            },

            function testCreateLayerId() {
                var tree = makeTree(),
                    parent = tree.findLayer('foo'),
                    child = tree.findLayer('foo/bar');
                assertTrue(tree.createLayerId(parent, child.getData() === child.id()));
            },

            function testTreeFilter() {
                var tree;

                tree = makeTree().filterByRegion('main');
                assertTrue(tree.findLayer('foo/bar') !== undefined);
                assertTrue(tree.findLayer('foo/baz') === undefined);
                assertTrue(tree.findLayer('foo/bat') !== undefined);

                tree = makeTree().filterByRegion('baz');
                assertTrue(tree.findLayer('foo/bar') === undefined);
                assertTrue(tree.findLayer('foo/baz') !== undefined);
                assertTrue(tree.findLayer('foo/bat') !== undefined);

                tree = makeTree().filterByName('bat');
                assertTrue(tree.findLayer('foo/bar') === undefined);
                assertTrue(tree.findLayer('foo/baz') === undefined);
                assertTrue(tree.findLayer('foo/bat') !== undefined);
            },

            function testFindLayer() {
                var tree = makeTree();
                assertTrue(tree.findLayer('foo') !== undefined);
                assertTrue(tree.findLayer('foo/bar') !== undefined);
                assertTrue(tree.findLayer('foo/baz') !== undefined);
                assertTrue(tree.findLayer('foo/bat') !== undefined);
                assertTrue(tree.findLayers(['foo', 'foo/bar']).length === 2);
            },

            function testWalk() {
                var tree = makeTree(),
                    result = {};
                tree.walk(function(layer) {
                    result[layer.id()] = 1;
                });
                assertTrue(result['foo'] !== undefined);
                assertTrue(result['foo/bar'] !== undefined);
                assertTrue(result['foo/baz'] !== undefined);
                assertTrue(result['foo/bat'] !== undefined);
            }
        ]);
    }
);
