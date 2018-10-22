/* 
    Object.keys polyfill taken from:  
    https://gist.github.com/atk/1034464
*/
Object.keys = Object.keys ||
    function(
        o, // object
        k, // key
        r  // result array
    ) {
        // initialize object and result
        r = [];
        // iterate over object keys
        for (k in o)
            // fill result array with non-prototypical keys
            r.hasOwnProperty.call(o, k) && r.push(k);
        // return result
        return r;
    };

/*
    Array.isArray polyfill from:
    https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Array/isArray
*/
if (!Array.isArray) {
    Array.isArray = function (vArg) {
        return Object.prototype.toString.call(vArg) === "[object Array]";
    };
}