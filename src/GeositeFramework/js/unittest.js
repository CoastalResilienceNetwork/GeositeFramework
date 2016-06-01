define([
        "dojo/Deferred",
        "dojo/promise/all",
        "underscore"
    ],
    function(Deferred,
             all,
             _) {
        "use strict";

        function runAllTests(tests) {
            var defers = _.map(tests, function(test) {
                var defer = new Deferred(),
                    done = function() {
                        defer.resolve();
                    };

                // Fail the test if it takes longer than 1000 ms to execute.
                setTimeout(function() {
                    if (!defer.isFulfilled()) {
                        console.debug(test.name + ' did not complete after the timeout period');
                        defer.reject();
                    }
                }, 1000);

                // Pass a "done" callback to any test that accepts 1 argument.
                if (test.length === 1) {
                    test(done);
                } else {
                    test();
                    done();
                }

                return defer;
            });
            var promise = all(defers);
            return promise.then(function() {
                console.debug(defers.length + ' tests passed');
            }, function() {
                console.debug('Some tests failed');
            });
        }

        function assertTrue(value) {
            if (!value) {
                throw new Error('Assertion failed');
            }
        }

        return {
            assertTrue: assertTrue,
            runAllTests: runAllTests
        };
    }
);
