Backbone.HashModels = (function(Backbone, _, $){
    "use strict";

    /************************************************************
     Utilities
    ************************************************************/

    // Via http://www.webtoolkit.info/javascript-base64.html
    // Free for use: http://www.webtoolkit.info/licence.html
    // UTF-8 encoding
    var encodeUtf8 = function (string) {
        string = string.replace(/\r\n/g,"\n");
        var utftext = '', n;

        for (n = 0; n < string.length; n++) {

            var c = string.charCodeAt(n);

            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }

        }

        return utftext;
    };

    // Via http://www.webtoolkit.info/javascript-base64.html
    // Free for use: http://www.webtoolkit.info/licence.html
    // UTF-8 decoding
    var decodeUtf8 = function (utftext) {
        var string = '';
        var i = 0;
        var c = 0,
            c1 = 0,
            c2 = 0,
            c3 = 0;

        while ( i < utftext.length ) {

            c = utftext.charCodeAt(i);

            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            }
            else if((c > 191) && (c < 224)) {
                c2 = utftext.charCodeAt(i+1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            }
            else {
                c2 = utftext.charCodeAt(i+1);
                c3 = utftext.charCodeAt(i+2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }

        }

        return string;
    };

    // Via http://www.webtoolkit.info/javascript-base64.html
    // Free for use: http://www.webtoolkit.info/licence.html
    // Base64 encoding
    var _base64Key = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    var encodeBase64 = function (input) {
        var output = '';
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;

        input = encodeUtf8(input);

        while (i < input.length) {

            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);

            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;

            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }

            output = output +
                _base64Key.charAt(enc1) + _base64Key.charAt(enc2) +
                _base64Key.charAt(enc3) + _base64Key.charAt(enc4);
        }

        return output;
    };

    // Via http://www.webtoolkit.info/javascript-base64.html
    // Free for use: http://www.webtoolkit.info/licence.html
    // Base64 decoding
    var decodeBase64 = function (input) {
        var output = '';
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;

        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');

        while (i < input.length) {

            enc1 = _base64Key.indexOf(input.charAt(i++));
            enc2 = _base64Key.indexOf(input.charAt(i++));
            enc3 = _base64Key.indexOf(input.charAt(i++));
            enc4 = _base64Key.indexOf(input.charAt(i++));

            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;

            output = output + String.fromCharCode(chr1);

            if (enc3 !== 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 !== 64) {
                output = output + String.fromCharCode(chr3);
            }

        }

        output = decodeUtf8(output);

        return output;

    };

    // Via http://jsolait.net/browser/trunk/jsolait/lib/codecs.js (LGPL)
    // LZW-compress a string
    var compressLzw = function(s) {
        var dict = {};
        var data = (s + "").split("");
        var out = [];
        var currChar;
        var phrase = data[0];
        var code = 256;
        var i;

        for (i=1; i<data.length; i++) {
            currChar=data[i];
            if (dict[phrase + currChar]) {
                phrase += currChar;
            }
            else {
                out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
                dict[phrase + currChar] = code;
                code++;
                phrase=currChar;
            }
        }
        out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
        for (i=0; i<out.length; i++) {
            out[i] = String.fromCharCode(out[i]);
        }
        return out.join("");
    };

    // Via http://jsolait.net/browser/trunk/jsolait/lib/codecs.js (LGPL)
    // Decompress an LZW-encoded string
    var decompressLzw = function(s) {
        var dict = {};
        var data = (s + "").split("");
        var currChar = data[0];
        var oldPhrase = currChar;
        var out = [currChar];
        var code = 256;
        var phrase;
        var i;

        for (i=1; i<data.length; i++) {
            var currCode = data[i].charCodeAt(0);
            if (currCode < 256) {
                phrase = data[i];
            }
            else {
               phrase = dict[currCode] ? dict[currCode] : (oldPhrase + currChar);
            }
            out.push(phrase);
            currChar = phrase.charAt(0);
            dict[code] = oldPhrase + currChar;
            code++;
            oldPhrase = phrase;
        }
        return out.join("");
    };

    /************************************************************
     Private members
    ************************************************************/

    var models = {};
    var watchedModelAttributes = {};
    var initialModelStates = {};
    var state = {};
    var stateString = '';
    var pendingState;
    var pendingStateString = '';

    var validdateEncodedCompressesStateString = function (s) {
        if (!s) {
            throw { name: 'ArgumentFalsey', message: 'Cannot convert falsey string to an object.' };
        } else {
            return s;
        }
    };

    var decodeStateObject = _.compose(
        JSON.parse,
        decompressLzw,
        decodeBase64,
        validdateEncodedCompressesStateString
    );

    var encodeStateObject = _.compose(
        encodeBase64,
        compressLzw,
        JSON.stringify
    );

    var defaultHashUpdateFunction = function(hash) {
        $.history.load(hash);
    };
    var updateHash = defaultHashUpdateFunction;

    var setupDefaultHashMonitorCallback = function(cb) {
        $.history.init(cb);
    };

    var handleModelChanged = function (model) {
        // backup the state in case there is an error changing it.
        var oldState = _.extend({}, state);
        var oldStateString = stateString;
        var newValues;
        var modelId;
        _.each(models, function(value, key, obj){
            if (value === model) {
                modelId = key;
            }
        });
        if (modelId === undefined) {
            throw "Could not determine ID for model " + JSON.stringify(model.attributes);
        }
        try {
           if (model.getState) {
                newValues = model.getState();
            } else {
                if (watchedModelAttributes[modelId]) {
                    newValues = _.pick(model.attributes, watchedModelAttributes[modelId]);
                } else {
                    newValues = model.attributes;
                }
            }
            if (options.updateOnChange) {
                state[modelId] = newValues;
                stateString = encodeStateObject(state);
                updateHash(stateString);
                HashModels.trigger('change', stateString);
            } else {
                pendingState = pendingState || {};
                pendingState[modelId] = newValues;
                pendingStateString = encodeStateObject(pendingState);
            }
        } catch (err) {
            // Unable to parse the new state; reset to old state
            state = oldState;
            stateString = oldStateString;
        }
    };

    var handleHashChanged = function (hash) {
        var newState = {};
        var newStateString = '';
        if (hash === stateString) {
            return;
        }
        if (hash) {
            newStateString = hash;
            newState = decodeStateObject(hash);
            _.each(newState, function(value, key, obj) {
                if (models[key] && value) {
                    if (models[key].setState) {
                        models[key].setState(value);
                    } else {
                        models[key].set(value);
                    }
                } else if (models[key]) {
                    if (models[key].setState) {
                        models[key].setState(initialModelStates[key]);
                    } else {
                        models[key].set(initialModelStates[key]);
                    }
                }
            });
        } else {
            _.each(models, function resetToInitialState(model, key, obj) {
                if (model.setState) {
                    model.setState(initialModelStates[key]);
                } else {
                    model.set(initialModelStates[key]);
                }
            });
        }
        state = newState;
        stateString = newStateString;
        HashModels.trigger('change', stateString);
    };

    var options = {
        updateOnChange: true
    };

    /************************************************************
     Public Interface
     ************************************************************/
    var HashModels =  {
        init: function(opts) {
            options = _.extend(options, opts);
            models = {};
            watchedModelAttributes = {};
            initialModelStates = {};
            state = {};
            stateString = '';
            pendingState = undefined;
            pendingStateString = '';

            updateHash = options.hashUpdateCallback || defaultHashUpdateFunction;

            if (options.setupHashMonitorCallback) {
                options.setupHashMonitorCallback(handleHashChanged);
            } else {
                setupDefaultHashMonitorCallback(handleHashChanged);
            }
            return this;
        },

        addModel: function(model, opts) {
            var eventsToWatch = 'change';
            var initialState;
            var modelOptions;
            if (_.isString(opts)) {
                modelOptions = {id: opts};
            } else {
                modelOptions = _.extend({}, opts);
            }
            var modelId = modelOptions.id || model.id;

            if (!modelId) {
                throw new Error("Options does not contain a truthy 'id' property and the model does not have a truthy 'id' attribute");
            }

            if (models[modelId] !== undefined) {
                throw new Error( "A model has already been added with id '" + modelId + '"');
            }
            models[modelId] = model;

            if (model.getState) {
                initialState = model.getState();
            } else {
                if (modelOptions.attributes && modelOptions.attributes.length) {
                    initialState = _.pick(model.attributes, modelOptions.attributes);
                } else {
                    initialState = _.extend({}, model.attributes);
                }
            }
            initialModelStates[modelId] = initialState;

            if (modelOptions.attributes && modelOptions.attributes.length) {
                watchedModelAttributes[modelId] = _.extend([], modelOptions.attributes);
                eventsToWatch = _.map(modelOptions.attributes, function(name) {
                    return 'change:' + name;
                }).join(' ');
            } else {
                 watchedModelAttributes[modelId] = null;
            }

            // If you load the page with a initial hash string, sync the
            // model object to with the hash state
            if (state[modelId]) {
                if (model.setState) {
                    model.setState(state[modelId]);
                } else {
                    model.set(state[modelId]);
                }
            }

            model.on(eventsToWatch, handleModelChanged, model);
            this.trigger('add', model, modelId);
            return modelId;
        },

        update: function() {
            if (pendingState !== undefined) {
                state = _.extend(state, pendingState);
                stateString = encodeStateObject(state);
            }
            updateHash(stateString);
            HashModels.trigger('change', stateString);
        },

        decodeStateObject: decodeStateObject,
        encodeStateObject: encodeStateObject
    };

    _.extend(HashModels, Backbone.Events);

    return HashModels;
})(Backbone, _, jQuery);