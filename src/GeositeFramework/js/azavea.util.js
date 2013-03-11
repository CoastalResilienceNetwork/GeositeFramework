var Azavea = {};

/*
 * NOTE ON STRING CONCATENATION:
 *     Use:
 *         var foo = [];
 *         foo.push('bar');
 *         foo.push('bar2');
 *         return foo.join('');
 *     Rather than:
 *         var foo = 'bar';
 *         foo = foo + 'bar2';
 *         return foo;
 *     Array.join is marginally slower than + on modern browsers, but it
 *     is EXPONENTIALLY faster on IE 7 and below.  So for any substantial
 *     amount of string concatenation, be sure to use Array.join if you are
 *     supporting any older IEs.
 *     Here's a blog describing this:
 *         http://blogs.sitepoint.com/2010/09/14/javascript-fast-string-concatenation/
 */

(function(az) {
    // Defaults (feel free to set to something different):
    az.logUrl = 'handlers/logger.ashx';

    // Utility functions:

    az.isArray = function(o) {
        /// <summary>Determines whether the argument is an array.</summary>
        /// http://thinkweb2.com/projects/prototype/instanceof-considered-harmful-or-how-to-write-a-robust-isarray/
        return Object.prototype.toString.call(o) === '[object Array]';
    };
    
    az.superEquals = function(thing1, thing2) {
        /// <summary>A somewhat generic object/array/primitive comparator.</summary>
        /// <returns>Boolean indicating equality</returns>
        var i;
        if (az.isArray(thing1) && az.isArray(thing2)) {
            //Compare two arrays
            
            if (thing1.length === thing2.length) {
                for (i=0; i<thing1.length; i++) {
                    if (!az.superEquals(thing1[i], thing2[i])) {
                        return false;
                    }
                }
            } else {
                return false;
            }
            
            return true;
        } else if (typeof(thing1) === 'object' && typeof(thing2) === 'object') {
            //Compare two objects
            
            if (thing1 !== null && thing2 !== null) {
                for (i in thing1) {
                    if (thing1.hasOwnProperty(i) && thing2.hasOwnProperty(i)) {
                        if (!az.superEquals(thing1[i], thing2[i])) {
                            return false;
                        }
                    } else {
                        return false;
                    }
                }
                
                for (i in thing2) {
                    if (thing1.hasOwnProperty(i) && thing2.hasOwnProperty(i)) {
                        if (!az.superEquals(thing1[i], thing2[i])) {
                            return false;
                        }
                    } else {
                        return false;
                    }
                }
            } else if (thing1 !== null || thing2 !== null) {
                return false;
            }
            return true;
        } else {
            // Compare two primitives OR two mismatch object types
            return thing1 === thing2;
        }
    };
    

    
    // Via http://www.webtoolkit.info/javascript-base64.html
    // Free for use: http://www.webtoolkit.info/licence.html
    // Base64 encoding
    var _base64Key = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    az.encodeBase64 = function (input) {
        var output = '';
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;
 
        input = az.encodeUtf8(input);
 
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
    az.decodeBase64 = function (input) {
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
 
        output = az.decodeUtf8(output);
 
        return output;
 
    };
 
    // Via http://www.webtoolkit.info/javascript-base64.html
    // Free for use: http://www.webtoolkit.info/licence.html
    // UTF-8 encoding
    az.encodeUtf8 = function (string) {
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
    az.decodeUtf8 = function (utftext) {
        var string = '';
        var i = 0;
        var c = 0,
            c1 = 0,
            c2 = 0;
 
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
    
    // Via http://jsolait.net/browser/trunk/jsolait/lib/codecs.js (LGPL)
    // LZW-compress a string
    az.compressLzw = function(s) {
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
    az.decompressLzw = function(s) {
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

    az.isStringTruthy = function(str) {
        /// <summary>Determines whether the string represents a falsy value.</summary>

        if (str === 'false') {
            return false;
        } else if (str === '') {
            return false;
        } else if (str === 'NaN') {
            return false;
        } else if (str === 'null') {
            return false;
        } else if (str === 'undefined') {
            return false;
        } else if (str === '0') {
            return false;
        }

        return true;
    };
    
    az.stripTags = function(text) {
        //Courtesy of prototypejs.org (MIT License)
        if (text && text.replace) {
            return text.replace(/<\w+(\s+("[^"]*"|'[^']*'|[^>])+)?>|<\/\w+>/gi, '');
        } else {
            return text;
        }
    };
    
    az.unescapeHTML = function(text) {
        //Courtesy of prototypejs.org (MIT License)
        if (text && text.replace) {
            return az.stripTags(text).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
        } else {
            return text;
        }
    };

    az.escapeHTML = function(text) {
        //Courtesy of prototypejs.org (MIT License)
        if (text && text.replace) {
            return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        } else {
            return text;
        }
    };

    az.getQueryStrParam = function(name, valueRegExpStr) {
        var retVal;
        if (window.location.search) {
            var matches, parts, eqIndex;

            matches = window.location.search.match(new RegExp('[?&]' + name + '=' + valueRegExpStr, 'gi'));
            if (matches && matches.length) {
                // We matched "name=something", now get the something.
                retVal = matches[0].substring(matches[0].indexOf('=') + 1);
            }
        }
        return retVal;
    };

    az.getIntParam = function(name) {
        /// <summary>Gets an integer parameter from the query string.</summary>
        var retVal = az.getQueryStrParam(name, '[-+]?[0-9]+');
        // If we got something, convert it to an integer.
        if (retVal) {
            retVal = parseInt(retVal, 10);
        }
        return retVal;
    };

    az.getFloatParam = function(name) {
        /// <summary>Gets a floating-point parameter from the query string.</summary>
        var retVal = az.getQueryStrParam(name, '[-+]?[0-9]*\\.?[0-9]+([eE][-+]?[0-9]+)?');
        // If we got something, convert it to a float.
        if (retVal) {
            retVal = parseFloat(retVal);
        }
        return retVal;
    };

    az.getStringParam = function(name) {
        /// <summary>Gets a string value from the query string.  Assumes it is encoded (I.E.
        ///          & delimits another query string param).</summary>
        var retVal = az.getQueryStrParam(name, '[^&]+');
        if (retVal) {
            retVal = decodeURIComponent(retVal);
        }
        return retVal;
    };

    az.log = function(msg) {
        /// <summary>Ensures the console exists before attempting to log.</summary>
        try {
            if (window.console && window.console.log) {
                window.console.log(msg);
            }
        } catch (ex) {
            // Empty catch block ensures that we never generate errors because
            // we tried to log a message.
        }
    };

    //Deprecated!
    az.formatAsMoney = function(num, excludeCents) {
        Azavea.log('Azavea.formatAsMoney is a deprecated function. Please switch to Azavea.renderers.money');
        return Azavea.renderers.money(num, excludeCents);
    };
    
    az.getValidFloat = function(val, min, max) {
        ///<summary>If val contains just a valid number, returns that number.
        ///         Otherwise returns NaN.</summary>
        var retVal = NaN;
        if (val) {
            //Does it look like a number?
            if (/^[0-9,]*(\.)?[0-9]*$/.test(val)) {
                val = val.replace(',', '');
                if (val[0] === '.') {
                    val = '0' + val;
                }
                retVal = parseFloat(val);
                if (retVal || retVal === 0) {
                    // Min or max might not be specified, but 0 is falsy so check for that.
                    if (min || (min === 0)) {
                        if (retVal < min) {
                            retVal = NaN;
                        }
                    }
                    if (max || (max === 0)) {
                        if (retVal > max) {
                            retVal = NaN;
                        }
                    }
                }
            }
        }
        return retVal;
    };
    
    az.getValidPercentage = function(val) {
        ///<summary>If val contains just a valid percentage (0-100%), returns that percentage.
        ///         Otherwise returns NaN.</summary>
        var retVal = NaN;
        if (/^[0-9,]*(\.)?[0-9]*%?$/.test(val)) {
            val = val.replace(',', '');
            if (val[0] === '.') {
                val = '0' + val;
            }
            retVal = parseFloat(val);
            if ((retVal < 0) || (retVal > 100)) {
                retVal = NaN;
            }
        }
        return retVal;
    };
    
    az.doLast = function(delay, callback) {
        ///<summary>A wrapper to handle rapid function calls when you only
        ///         want to execute the last call. For example, if you set
        ///         a delay of 500ms and execute the callback 3 times within
        ///         500ms, only the last call will execute.</summary>
        
        var timeoutId;
        
        return function(){
            (function(args) {
                //Clear the last timeout, if applicable, then set a new one
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }

                //Call the function after the delay expires
                timeoutId = setTimeout(function() {
                    return callback.apply(this, args);
                }, delay);
            }(arguments));
        };
    };

    az.errorToString = function(error) {
        var errorStr = '';
        if (error) {
            if (typeof error === 'string') {
                errorStr = error;
            } else {
                $.each(error, function(i, val) {
                    if (errorStr === '') {
                        errorStr = '{ ';
                    } else {
                        errorStr += ', ';
                    }
                    errorStr += i + ': ' + val;
                });
                errorStr += ' }';
            }
        }
        return errorStr;
    };

    az.tryCatch = function(tryingTo, callMe) {
        /// <summary>
        ///     Wrap any call with this to do a little error handling cleanup if the call fails.
        ///
        ///     Instead of:
        ///         $.each(someList, function(i, thing) {
        ///                ...do something...
        ///             });
        ///
        ///     Use:
        ///         $.each(someList, Azavea.tryCatch("doing something", function(i, thing) {
        ///                ...do something...
        ///             }));
        ///
        /// </summary>
        return function() {
            if (az.timeTryCatch) {
                az.startTiming(tryingTo);
            }
            try {
                return callMe.apply(this, arguments);
            } catch (e) {
                az.logError('Unexpected error while calling:\n' + callMe +
                    '\nWith arguments:\n' + arguments, tryingTo, e);
                
                alert('Unable to ' + tryingTo + '.  An error occurred: ' + az.errorToString(e));
                throw e;
            } finally {
                if (az.timeTryCatch) {
                    az.endTiming(tryingTo);
                }
            }
        };
    };

    az.logError = function (message, triedTo, error) {
        /// <summary>Makes a call to a logging handler to log the error with the server-side log.
        ///          In order for this to work, Azavea.logHandlerUrl must be set.
        ///          Also logs to the console if possible.</summary>
        if (!az.logUrl) {
            return;
        }
        try {
            var errorStr = az.errorToString(error);
            $.ajax({
                url: az.logUrl,
                type: 'POST',
                data: {
                    message: message,
                    triedTo: triedTo,
                    url: window.location.href,
                    level: 'ERROR'
                },
                dataType: 'text',
                success: function (resp) {
                    az.log("Successfully logged error to server, message '" +
                        message + "', attempted action '" + triedTo + "', error '" + errorStr +
                        "'.  Handler response: '" + resp + "'.");
                },
                error: function (resp) {
                    az.log("Unable to log error to server (" + az.logUrl + "), original message '" +
                        message + "', original attempted action '" + triedTo + "', original error '" + errorStr +
                        "'.  Handler response: '" + resp.responseText + "'.");
                }
            });
        } catch (e) {
            az.log("Error while attempting to handle an error, original message '" +
                message + "', original attempted action '" + triedTo + "', original error '" + error +
                "'.  New error: '" + e + "'.");
        }
    };

    az.logMessage = function (message, logger, level) {
        /// <summary>Logs a message to a server-side log, using specified level and logger name.
        ///          In order for this to work, Azavea.logHandlerUrl must be set.</summary>
        if (!az.logUrl) {
            return;
        }
        $.ajax({
            url: az.logUrl,
            type: 'POST',
            data: {
                message: message,
                url: window.location.href,
                logger: logger,
                level: level
            },
            dataType: 'text',
            error: function (resp) {
                az.log("Unable to log message to server (" + az.logUrl + "), original message '" +
                    message + "'.  Handler response: '" + resp.responseText + "'.");
            }
        });
    };

    az.inputOnFocus = function(defaultText, defaultTextStyle) {
        /// <summary>Returns a function to use in the jquery .focus(...) method.
        ///          Default text is the text to show if the user hasn't input anything.
        ///          Default text style is the style to use when displaying the default text. </summary>
        return az.tryCatch('respond to focus on input with default text "' + defaultText +
            '", default text style "' + defaultTextStyle + '"', function() {
                    // On focus, we blank out the default text if it is there
                    // and we remove the 'default text' styling.
                    if (defaultText) {
                        if ($(this).val() === defaultText) {
                            $(this).val('');
                        }
                    }
                    
                    this.select();
                    
                    if (defaultTextStyle) {
                        $(this).removeClass(defaultTextStyle);
                    }
                });
    };
    az.inputOnBlur = function(defaultText, defaultTextStyle) {
        /// <summary>Returns a function to use in the jquery .blur(...) method.
        ///          Default text is the text to show if the user hasn't input anything.
        ///          Default text style is the style to use when displaying the default text. </summary>
        return az.tryCatch('respond to blur on input with default text "' + defaultText +
            '", default text style "' + defaultTextStyle + '"', function() {
                    // On blur, we add the default text if the user has not entered anything
                    // and we add the 'default text' styling.
                    var val = $(this).val();
                    if (!val || (defaultText && (val === defaultText))) {
                        if (defaultTextStyle) {
                            $(this).addClass(defaultTextStyle);
                        }
                        if (defaultText) {
                            $(this).val(defaultText);
                        }
                    } else {
                        // In case this is called on a change or something where we didn't get
                        // a chance to disable the style on focus.
                        if (defaultTextStyle) {
                            $(this).removeClass(defaultTextStyle);
                        }
                    }
                });
    };


    /* Set this to true to automatically time every call that goes through Azavea.tryCatch */
    az.timeTryCatch = false;

    /* This is where we store the timings that have been measured. */
    var timings = {};
    az.startTiming = function(label) {
        /*
         * Begins timing a certain label.  Will count how many and when you
         * print the results you'll get total, count, and average.
         * NOTE: If you didn't call endTiming, your previous start time for
         *       this label will be lost.
         */
        if (!timings[label]) {
            timings[label] = { total: 0, count: 0, start: new Date().getTime() };
        } else {
            timings[label].start = new Date().getTime();
        }
    };
    az.endTiming = function(label) {
        /*
         * Finishes timing a certain label.
         * Print the results to get total, count, and average.
         * NOTE: If you didn't call startTiming, the time will be counted as zero.
         */
        var timing, totaltime;
        var endTime = new Date().getTime();
        if (!timings[label]) {
            timings[label] = { total: 0, count: 1, untimed: 1 };
        } else {
            timing = timings[label];
            if (!timing.count) {
                timing.count = 1;
            } else {
                timing.count += 1;
            }
            if (!timing.start) {
                if (!timing.untimed) {
                    timing.untimed = 1;
                } else {
                    timing.untimed += 1;
                }
            } else {
                totalTime = endTime - timing.start;
                if (!timing.total) {
                    timing.total = totalTime;
                } else {
                    timing.total += totalTime;
                }
            }
        }
    };
    az.timingToString = function(minMs) {
        /*
         * Prints the results (so far) of all the timing statements.
         * Includes total, count, and average.  If minMs is set, only
         * results with a total of at least that many ms will be displayed.
         */
        var retVal = ["Performance timings as of ", dateToISOString(new Date()), ":\n"];
        $.each(timings, function(label, timing) {
            if (timing.total && (!minMs || (timing.total > minMs))) {
                var realCount = timing.count;
                retVal.push(az.padRight(label, 50));
                retVal.push(" - Count: ");
                retVal.push(az.padLeft(timing.count, 6));
                retVal.push(", Total Time: ");
                retVal.push(az.padLeft(timing.total, 9));
                retVal.push("ms");
                if (realCount && timing.total) {
                    if (timing.untimed) {
                        realCount = realCount - timing.untimed;
                    }
                    retVal.push(", Average: ");
                    retVal.push(az.padLeft((timing.total / realCount).toFixed(3), 10));
                    retVal.push("ms");
                }
                retVal.push("\n");
                if (timing.untimed) {
                    retVal.push("    *** NOTE: ");
                    retVal.push(timing.untimed);
                    retVal.push(" runs were NOT TIMED due to having no start time.  Total and Average do not include these runs.\n");
                }
            }
        });
        return retVal.join('');
    };
    az.timingToHtml = function(minMs) {
        /*
         * Prints the results (so far) of all the timing statements in an HTML table.
         * Includes total, count, and average.  If minMs is set, only
         * results with a total of at least that many ms will be displayed.
         */
        var retVal = ['<div class="azPerf"><br/>Performance timings as of ', az.dateToISOString(new Date()),
                      ':<table><tr><th style="padding:3px">Label</th><th style="padding:3px">Count</th><th style="padding:3px">Total Time</th><th style="padding:3px">Average Time</th><th style="padding:3px">Notes</th></tr>'];
        $.each(timings, function(label, timing) {
            if (timing.total && (!minMs || (timing.total > minMs))) {
                var realCount = timing.count;
                retVal.push('<tr><td style="text-align:left">');
                retVal.push(label);
                retVal.push('</td><td style="text-align:right">');
                retVal.push(timing.count);
                retVal.push('</td><td style="text-align:right">');
                retVal.push(timing.total);
                retVal.push('ms</td><td style="text-align:right">');
                if (realCount && timing.total) {
                    if (timing.untimed) {
                        realCount = realCount - timing.untimed;
                    }
                    retVal.push((timing.total / realCount).toFixed(3));
                    retVal.push('ms');
                }
                retVal.push('</td><td style="text-align:left">');
                if (timing.untimed) {
                    retVal.push(timing.untimed);
                    retVal.push(" runs were NOT TIMED due to having no start time.  Total and Average do not include these runs.");
                }
                retVal.push('</td></tr>');
            }
        });
        retVal.push("</table>");
        return retVal.join('');
    };


    /** String utilities */

    az.trimString = function(str) {
        /*
         * Trims all whitespace from the front and end of this string.
         * Courtesy of prototypejs.org (MIT License)
         */
        return str.replace(/^\s+/, '').replace(/\s+$/, '');
    };

    az.padLeft = az.tryCatch('padleft a string', function(str, length, padding) {
        /*
         * Pads the input string with the given padding (or spaces if padding is not
         * specified) until the str length is greater than or equal to the specified length.
         */
        var s = str.toString();
        padding = padding || ' ';
        while (length && (s.length < length)) {
            s = padding + s;
        }
        return s;
    });
    az.padRight = az.tryCatch('padright a string', function(str, length, padding) {
        /*
         * Pads the input string with the given padding (or spaces if padding is not
         * specified) until the str length is greater than or equal to the specified length.
         */
        var s = str.toString();
        padding = padding || ' ';
        while (length && (s.length < length)) {
            s = s + padding;
        }
        return s;
    });

    /** Number utilities */
    az.numberToString = az.tryCatch('convert a number to a nicely formatted string', function(num, precision, split) {
        /// <summary>numeric toString to handle decimal precision and commas</summary>
        var str;
        if (precision !== undefined && typeof precision === "number") {
            str = num.toFixed(precision);
        } else {
            str = num.toString();
        }
        var t = '';
        if (split || split === undefined) {
            var lr = str.split('.'); // left/right pieces
            var lft = lr[0], rgt = lr.length === 2 ? lr[1] : ''; // left piece, right piece
            var i; len = lft.length;
            for (i = 0; i < len; i++) {
                if (i > 0 && (len - i) % 3 === 0) {
                    t += ',';
                }
                //t += lft[i]; // ie7 didn't like this, but seems to tolerate the following
                t += lft.slice(i, i + 1);
            }
            // if there was something after the ".", add it back in
            if (rgt) {
                t += '.' + rgt;
            }
        } else {
            t = str;
        }
        return t;
    });

    // Reference: http://stackoverflow.com/questions/18082/validate-numbers-in-javascript-isnumeric
    az.isNumber = Azavea.tryCatch('check if the argument is a number', function(value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    });

    /** Date utilities */
    az.addToDate = Azavea.tryCatch('add time to a date', function(d, interval, amt) {
        /*
         * Adds an amount (amt) of time units specified by interval (I.E. 'SECOND') to
         * the date d.
         */
        var retVal = d;
        switch (interval.toUpperCase()) {
            case 'SECOND': retVal.setSeconds(d.getSeconds() + amt); break;
            case 'MINUTE': retVal.setMinutes(d.getMinutes() + amt); break;
            case 'HOUR': retVal.setHours(d.getHours() + amt); break;
            case 'DAY': retVal.setHours(d.getHours() + (amt * 24)); break;
            case 'WEEK': retVal.setHours(d.getHours() + ((amt * 7) * 24)); break;
            case 'MONTH': retVal.setMonth(d.getMonth() + amt); break;
            case 'YEAR': retVal.setFullYear(d.getFullYear() + amt); break;
        }
        return retVal;
    });

    az.cloneDate = Azavea.tryCatch('clone a date', function(d) { return new Date(d.getTime()); });

    az.dateToISOString = Azavea.tryCatch('convert a date to an ISO string', function(d) {
        // From http://www.json.org/json.js. Public Domain. 
        function f(n) {
            return n < 10 ? '0' + n : n;
        }
        // added for milliseconds by Azavea
        function f1(n) {
            if (n < 10) { return '00' + n; }
            if (n < 100) { return '0' + n; }
            return n;
        }

        return d.getUTCFullYear() + '-' +
            f(d.getUTCMonth() + 1) + '-' +
            f(d.getUTCDate()) + 'T' +
            f(d.getUTCHours()) + ':' +
            f(d.getUTCMinutes()) + ':' +
            f(d.getUTCSeconds()) + '.' +
            f1(d.getUTCMilliseconds()) + 'Z';
    });

    az.parseISOString = Azavea.tryCatch('convert ISO string to date', function(dateString){
         
 
        if (dateString){
            var regexp = "([0-9]{4})(-([0-9]{2})(-([0-9]{2})" +
                "(T([0-9]{2}):([0-9]{2})(:([0-9]{2})(\\.([0-9]+))?)?" +
                "(Z|(([-+])([0-9]{2}):([0-9]{2})))?)?)?)?";
            var d = dateString.match(new RegExp(regexp));

            var offset = 0;
            var date = new Date(d[1], 0, 1);

            if (d[3]) { date.setMonth(d[3] - 1); }
            if (d[5]) { date.setDate(d[5]); }
            if (d[7]) { date.setHours(d[7]); }
            if (d[8]) { date.setMinutes(d[8]); }
            if (d[10]) { date.setSeconds(d[10]); }
            if (d[12]) { date.setMilliseconds(Number("0." + d[12]) * 1000); }
            if (d[14]) {
                offset = (Number(d[16]) * 60) + Number(d[17]);
                offset *= ((d[15] === '-') ? 1 : -1);
            }

            // This does not jive with the ISO that .net returns
            // offset -= date.getTimezoneOffset();
            time = (Number(date) + (offset * 60 * 1000));
            return new Date(time);
        }        
        
    });
    
    // Some versions of IE do not natively support indexOf on arrays.
    az.arrayIndexOf = Azavea.tryCatch('get the index of the first occurance of an item in an array',
        function(array, item) {
            var i;
            for(i = 0; i < array.length; i++) {
                if(array[i] === item) {
                    return i;
                }
            }
            return -1;
        }
    );

}(Azavea));
