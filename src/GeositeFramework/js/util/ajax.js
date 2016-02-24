//= require underscore
define(['esri/request'],
    function(request) {
        'use strict';

        var cache = {},
            promises = {};

        function get(url) {
            return cache[url];
        }

        // Fetch data from `url` and store the result in `cache` (memoized).
        var fetch = function(url, options) {
            var options = options || {},
                settings = _.defaults(options, {
                    format: 'json',
                    content: {f: 'json'}
                });

            if (typeof promises[url] === 'undefined') {
                promises[url] = request({
                    url: url,
                    content: settings.content,
                    handleAs: settings.format,
                    callbackParamName: 'callback',
                    timeout: 20000
                }).then(function(data) {
                    cache[url] = data;
                }, function(error) {
                    cache[url] = error;
                }).then(function() {
                    return cache[url];
                });
            }
            return promises[url];
        };

        function isFetching(url) {
            return typeof promises[url] !== 'undefined';
        }

        function isCached(url) {
            return typeof cache[url] !== 'undefined';
        }

        function shouldFetch(url) {
            return !isFetching(url) && !isCached(url);
        }

        return {
            get: get,
            fetch: fetch,
            isCached: isCached,
            shouldFetch: shouldFetch
        };
    }
);