# Layer Selector Rewrite

## Context

The layer selector plugin has grown in complexity over the years and has
accumulated a fair amount of technical debt. Fixing bugs and adding new
features has become increasingly difficult and time consuming as a result.

Some issues with the current implementation:

* The widget we use ([Ext JS Tree Panel](https://docs.sencha.com/extjs/6.0/components/trees.html))
does not provide enough control over how nodes are rendered.
* It is difficult to add buttons and other interactions to each leaf node
(zoom to extent, download button, etc.) using Ext JS Tree Panel.
* Separation between *saved state* and *actual state*. The in-memory representation
of the tree often differs from the serialized tree state, which has led to
synchronization issues.
* Lack of high-level data abstractions make it difficult to understand
how the plugin transforms data for rendering.
* Mutable state occasionally leads to data corruption caused by performing
certain sequences.

## Decision

We have decided to rewrite the layer selector from scratch before adding
new features.

To resolve the problems previously described, the new layer selector should
have the following qualities:

* The UI should be defined using simple `underscore` templates so we retain
full control over the look & feel.
* All user interactions should aspire to update a singular state object,
which will then cause the UI to be redrawn. In this way, the UI will always
be a reflection of what actually exists in the saved state.
* There should be a separation between the layer config and the layer data
that is loaded at runtime. This is to prevent bugs that can result from
mutating a single state repeatedly.
* Services and layer data should be lazily loaded when possible.

## Consequences

Some of these consequences will be resolved after the initial rewrite has been
completed.

* There will be less configuration options.
* Subregions won't be supported.
* Service params will not be supported (displayLevels, mode, symbology, autoGeneralize, displayOnPan, etc.)
* Changes to `layers.json` schema will not be backwards compatible (Ref: https://gist.github.com/caseypt/afb0d266f3144af212d0).