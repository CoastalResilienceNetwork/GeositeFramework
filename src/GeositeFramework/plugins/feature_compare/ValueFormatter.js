define(["use!underscore"], function(_) {

    var Formatter = function(options) {
        this.options = options;
        this.validFormats = ['number', 'percent', 'text'];
    };

    Formatter.prototype.render = function(value) {
        if (!this.options ||
            !this.options.format ||
            !_.contains(this.validFormats, this.options.format)) {

            return {
                valid: false,
                origValue: value,
                msg: "No valid format type given.  Valid types are: "
                    + this.validFormats.join(", ")
            };
        }

        if (value === null) {
            return { valid: true, origValue: value, value: '[No Value]' };
        }

        if (this.options.format === 'number') {
            return this.number(value, this.options);
        }

        if (this.options.format === 'percent') {
            return this.percent(value, this.options);
        }

        if (this.options.format === 'text') {
            return this.text(value, this.options);
        }
    };
    
    Formatter.prototype._getNumeric = function(inputVal) {
        var value = parseFloat(inputVal);

        if (isNaN(value)) {
            return {
                valid: false,
                origValue: inputVal,
                msg: "Unable to parse value to float for numeric formatting"
            };
        }

        return { valid: true, value: value };
    };
    
    Formatter.prototype.number = function(inputVal, options, valTransformFn) {
        var val = this._getNumeric(inputVal),
            retValue = { valid: true, value: null, origValue: inputVal };
        
        if (!val.valid) {
            return val;
        }
        var value = val.value;

        // Specific numeric formatters (ie, percent) can transform the value
        if (_.isFunction(valTransformFn)) {
            value = valTransformFn(value);
        }
        
        // If no specific formatting, return a sane default [ .054345 = 5.43% ]
        if (!options) {
            retValue.value = this._formatNumber(value, 2, options.unit);
            return retValue;
        }

        // To prevent very low values from being rounded to 0, check for a min
        // threshold to indicate a low, but non-zero value.  [ .00003 = "< 0.01%" ]
        if (value < options.nonZeroCutoff && value !== 0) {
            retValue.value =  "< " + options.nonZeroCutoff + options.unit;
            return retValue;
        }

        // Digits after decimal, 2 as default
        var digits = _.has(options, "digits") ? parseInt(options.digits) : 2;
        retValue.value = this._formatNumber(value, digits, options.unit);
        return retValue;
    };
    
    Formatter.prototype.percent = function(inputVal, options) {
        // Format number as a percentage
        return this.number(inputVal, options, function(v) { return v * 100; });
    };

    Formatter.prototype.text = function (inputVal, options) {
        var val = inputVal ? inputVal : '[No Value]',
            maxLength = options.maxLength || 50;

        if (val.length > maxLength) {
            // Clip overflow text and replace with elipses
            val = val.substr(0, maxLength - 3) + "...";
        }
        
        return {
            valid: true,
            value: val,
            origValue: inputVal
        };
    };

    Formatter.prototype._formatNumber = function(num, digits, unit) {
        return +num.toFixed(digits) + unit;
    };
    
    return Formatter;
});