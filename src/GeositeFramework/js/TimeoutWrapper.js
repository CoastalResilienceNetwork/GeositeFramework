/*jslint nomen:true, devel:true */
/*global _, Geosite, setTimeout, clearTimeout */

// a utility for seamlessly promoting normal functions
// to functions that can only be run within a certain
// period of time.

// requires:
// * success - a function and a number of milliseconds.
// * ms - number of milliseconds to allow function to run.

// optional:
// * failure - a callback to run when the timeout occurs
// * executeOnce - a callback that should only run once
//   in the case of success or failure. This is to avoid
//   duplication in your success/error functions.

(function (N) {

    N.timeoutWrapper = function (args) {

        var noOp = function () { return null; },

            // required args
            success = args.success,
            ms = args.ms,

            // optional args
            failure = args.failure || noOp,
            executeOnce = args.executeOnce || noOp,
            
            // internal args
            _timeoutHappened = false,
            _successHappened = false,
            _failureWrapper = function (args) {
                if (_successHappened === false) {
                    _timeoutHappened = true;
                    failure(args);
                    executeOnce();
                }
            },
            _timeoutTracker = setTimeout(_failureWrapper, ms);

            return function (args) {
                if (_timeoutHappened === false) {
                    _successHappened = true;
                    success(args);
                    // TODO: not sure if this is necessary
                    // since the failure function won't
                    // do anything if successHappened = true
                    clearTimeout(_timeoutTracker);
                    executeOnce();
                }
            };
    };

}(Geosite));
