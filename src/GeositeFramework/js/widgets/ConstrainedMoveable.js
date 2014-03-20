/*jslint nomen:true, devel:true */

define(['use!Geosite',
         'dojo/_base/lang',
         'dojo/_base/declare',
         'dojo/dom-geometry',
         'dojo/dom-style',
         'dojo/dnd/move',
         'dojo/dnd/Mover'
        ],
    function(N,
             lang,
             declare,
             domGeom,
             domStyle,
             move,
             Mover) {

    //
    // Moveable widget that is constrained by its parent node and repositions itself
    // when the window is resized.
    //
    // Dojo moveable widgets create movers that exist during the span of mouse drag
    // operations. This subclass adds support for constraining a node within parent bounds
    // when its container size changes.
    //
    var ConstrainedMoveable = declare([move.parentConstrainedMoveable], {
        constructor: function() {
            this.inherited(arguments);
            // Our mover will be used to handle drag events.
            this.mover = CustomMover;
            // Widget will keep its default position until the user moves it.
            this.docked = true;
            this.resizeHandler = lang.hitch(this, 'onWindowResize');
            $(N).on('resize', this.resizeHandler);
        },

        destroy: function() {
            this.inherited(arguments);
            $(N).off('resize', this.resizeHandler);
        },

        onFirstMove: function() {
            this.inherited(arguments);
            this.docked = false;
        },

        onWindowResize: function(e) {
            if (this.docked || !this.isVisible()) {
                return;
            }
            var mover = new Mover(this.node, e, this);
            var leftTop = domGeom.getMarginBox(this.node);
            this.onFirstMove(mover);
            this.onMove(mover, leftTop);
            mover.destroy();
        },

        isVisible: function() {
            return domStyle.get(this.node, 'display') != 'none';
        }
    });

    //
    // Issue #222: Legend Container "jumps" on first click.
    //
    // The default Dojo Mover includes the header as part of the container content box when
    // calculating the widget position for the first time.
    //
    // To prevent this, we set an absolutely positioned value before Dojo gets the chance to.
    //
    var CustomMover = declare([Mover], {
        onFirstMove: function(e) {
            this.computePosition();
            this.inherited(arguments);
        },
        computePosition: function() {
            var s = this.node.style;
            if (s.position) {
                return;
            }
            var m = domGeom.getMarginBox(this.node);
            s.position = "absolute";
            s.left = m.l + 'px';
            s.top = m.t + 'px';
        }
    });

    return ConstrainedMoveable;
});
