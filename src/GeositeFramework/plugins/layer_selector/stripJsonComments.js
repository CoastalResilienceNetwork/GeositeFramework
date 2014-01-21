/*!
        strip-json-comments
        Strip comments from JSON. Lets you use comments in your JSON files!
        https://github.com/sindresorhus/strip-json-comments
        by Sindre Sorhus
        MIT License
        Version 0.1.1
*/
define(function () {
    'use strict';

    function stripJsonComments(str) {
        var currentChar;
        var nextChar;
        var insideString = false;
        var insideComment = false;
        var ret = '';

        for (var i = 0; i < str.length; i++) {
            currentChar = str[i];
            nextChar = str[i + 1];

            if (!insideComment && str[i - 1] !== '\\' && currentChar === '"') {
                insideString = !insideString;
            }

            if (insideString) {
                ret += currentChar;
                continue;
            }

            if (!insideComment && currentChar + nextChar === '//') {
                insideComment = 'single';
                i++;
            } else if (insideComment === 'single' && currentChar + nextChar === '\r\n') {
                insideComment = false;
                i++;
            } else if (insideComment === 'single' && currentChar === '\n') {
                insideComment = false;
            } else if (!insideComment && currentChar + nextChar === '/*') {
                insideComment = 'multi';
                i++;
                continue;
            } else if (insideComment === 'multi' && currentChar + nextChar === '*/') {
                insideComment = false;
                i++;
                continue;
            }

            if (insideComment) {
                continue;
            }

            ret += currentChar;
        }

        return ret;
    }

    return stripJsonComments;
});
