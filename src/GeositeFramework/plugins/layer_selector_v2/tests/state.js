define([
        "underscore",
        "framework/unittest",
        "../LayerNode",
        "../State"
    ],
    function(_,
             unittest,
             LayerNode,
             State) {
        "use strict";

        var assertTrue = unittest.assertTrue;

        unittest.runAllTests([
            function testCurrentRegion() {
                var state = new State();
                assertTrue(state.getCurrentRegion() === 'main');

                state = state.setCurrentRegion('test');
                assertTrue(state.getCurrentRegion() === 'test');

                state = state.setCurrentRegion(null);
                assertTrue(state.getCurrentRegion() === 'main');
            },

            function testFilterText() {
                var state = new State();
                assertTrue(state.getFilterText() === '');

                state = state.setFilterText('   test   ');
                assertTrue(state.getFilterText() === 'test');
            },

            function testOpacity() {
                var state = new State(),
                    layerId = 'test';

                assertTrue(state.getLayerOpacity(layerId) === undefined);

                _.each(_.range(0, 1, 0.1), function(n) {
                    state = state.setLayerOpacity(layerId, n);
                    assertTrue(state.getLayerOpacity(layerId) === n);
                });
            },

            function testToggleLayer() {
                var state = new State(),
                    layer = LayerNode.fromJS({
                        name: 'foo',
                        includeLayers: [
                            { name: 'bar' }
                        ]
                    });

                assertTrue(!state.isExpanded('foo'));
                state = state.toggleLayer(layer.findLayer('foo'));
                assertTrue(state.isExpanded('foo'));

                assertTrue(!state.isSelected('foo/bar'));
                state = state.toggleLayer(layer.findLayer('foo/bar'));
                assertTrue(state.isSelected('foo/bar'));

                state = state.toggleLayer(layer.findLayer('foo/bar'));
                assertTrue(!state.isSelected('foo/bar'));

                state = state.toggleLayer(layer.findLayer('foo'));
                assertTrue(!state.isExpanded('foo'));
            },

            function testInfoBox() {
                var state = new State(),
                    layerId = 'test';

                assertTrue(state.getInfoBoxLayerId() === null);
                assertTrue(!state.infoIsDisplayed(layerId));

                state = state.setInfoBoxLayerId(layerId);
                assertTrue(state.getInfoBoxLayerId() === layerId);
                assertTrue(state.infoIsDisplayed(layerId));

                state = state.clearInfoBoxLayerId();
                assertTrue(state.getInfoBoxLayerId() === null);
                assertTrue(!state.infoIsDisplayed(layerId));
            }
        ]);
    }
);
