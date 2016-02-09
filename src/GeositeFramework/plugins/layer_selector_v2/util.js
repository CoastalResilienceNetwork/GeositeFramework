define(['underscore'], function(_) {
    "use strict";

    // Differs from the underscore `find` in that this version will return
    // the first non-falsy result, instead of an item from `collection`.
    // Synonymous to: _.filter(_.map(collection, predicate))[0]
    function find(collection, predicate, context) {
        for (var i = 0; i < collection.length; i++) {
            var found = predicate.call(context, collection[i]);
            if (found) {
                return found;
            }
        }
        return undefined;
    }

    function urljoin() {
        return _.reduce(arguments, function(a, b) {
            if (a.endsWith('/')) {
                return a + b;
            }
            return a + '/' + b;
        });
    }

    return {
        find: find,
        urljoin: urljoin
    };
});