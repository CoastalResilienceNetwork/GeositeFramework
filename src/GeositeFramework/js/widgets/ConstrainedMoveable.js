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

        // Handle cases where the element is large enough that
        // it can potentially get hidden behind the app title bar
        // or the resize handle gets moved outside the window. #438
        onMoved: function(e) {
            // If the element title bar gets moved behind the app title
            // bar because of Dojo snapping behavior, move the element
            // vertically so it's just under the app title bar.
            var leftTop = domGeom.getMarginBox(this.node);

            if (leftTop.t < 0) {
                this.node.style.top = '0px';
            }

            // If the size of the element has been expanded
            // to be bigger than the window, shorten it so it
            // fits and the resize handle is visible.
            var elSize = domGeom.getContentBox(this.node),
                appTitleBarHeight = 45,
                bottomPadding = 35; // Enough to make resize handle visible.

            if (window.innerHeight - (elSize.h + appTitleBarHeight) < 0) {
                var newHeight = elSize.h + ((window.innerHeight - elSize.h) - bottomPadding);
                domGeom.setMarginBox(this.node, { h: newHeight });
            }
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
