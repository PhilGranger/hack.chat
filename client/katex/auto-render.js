(function(e){if("function"==typeof bootstrap)bootstrap("rendermathinelement",e);else if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else if("undefined"!=typeof ses){if(!ses.ok())return;ses.makeRenderMathInElement=e}else"undefined"!=typeof window?window.renderMathInElement=e():global.renderMathInElement=e()})(function(){var define,ses,bootstrap,module,exports;
return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* global katex */

var splitAtDelimiters = require("./splitAtDelimiters");

var splitWithDelimiters = function(text, delimiters) {
    var data = [{type: "text", data: text}];
    for (var i = 0; i < delimiters.length; i++) {
        var delimiter = delimiters[i];
        data = splitAtDelimiters(
            data, delimiter.left, delimiter.right,
            delimiter.display || false);
    }
    return data;
};

var renderMathInText = function(text, delimiters) {
    var data = splitWithDelimiters(text, delimiters);

    var fragment = document.createDocumentFragment();

    for (var i = 0; i < data.length; i++) {
        if (data[i].type === "text") {
            fragment.appendChild(document.createTextNode(data[i].data));
        } else {
            var span = document.createElement("span");
            var math = data[i].data;
            try {
                katex.render(math, span, {
                    displayMode: data[i].display
                });
            } catch (e) {
                if (!(e instanceof katex.ParseError)) {
                    throw e;
                }
                console.error(
                    "KaTeX auto-render: Failed to parse `" + data[i].data +
                    "` with ",
                    e
                );
                fragment.appendChild(document.createTextNode(data[i].rawData));
                continue;
            }
            fragment.appendChild(span);
        }
    }

    return fragment;
};

var renderElem = function(elem, delimiters, ignoredTags) {
    for (var i = 0; i < elem.childNodes.length; i++) {
        var childNode = elem.childNodes[i];
        if (childNode.nodeType === 3) {
            // Text node
            var frag = renderMathInText(childNode.textContent, delimiters);
            i += frag.childNodes.length - 1;
            elem.replaceChild(frag, childNode);
        } else if (childNode.nodeType === 1) {
            // Element node
            var shouldRender = ignoredTags.indexOf(
                childNode.nodeName.toLowerCase()) === -1;

            if (shouldRender) {
                renderElem(childNode, delimiters, ignoredTags);
            }
        }
        // Otherwise, it's something else, and ignore it.
    }
};

var defaultOptions = {
    delimiters: [
        {left: "$$", right: "$$", display: true},
        {left: "\\[", right: "\\]", display: true},
        {left: "\\(", right: "\\)", display: false}
        // LaTeX uses this, but it ruins the display of normal `$` in text:
        // {left: "$", right: "$", display: false}
    ],

    ignoredTags: [
        "script", "noscript", "style", "textarea", "pre", "code"
    ]
};

var extend = function(obj) {
    // Adapted from underscore.js' `_.extend`. See LICENSE.txt for license.
    var source, prop;
    for (var i = 1, length = arguments.length; i < length; i++) {
        source = arguments[i];
        for (prop in source) {
            if (Object.prototype.hasOwnProperty.call(source, prop)) {
                obj[prop] = source[prop];
            }
        }
    }
    return obj;
};

var renderMathInElement = function(elem, options) {
    if (!elem) {
        throw new Error("No element provided to render");
    }

    options = extend({}, defaultOptions, options);

    renderElem(elem, options.delimiters, options.ignoredTags);
};

module.exports = renderMathInElement;

},{"./splitAtDelimiters":2}],2:[function(require,module,exports){
var findEndOfMath = function(delimiter, text, startIndex) {
    // Adapted from
    // https://github.com/Khan/perseus/blob/master/src/perseus-markdown.jsx
    var index = startIndex;
    var braceLevel = 0;

    var delimLength = delimiter.length;

    while (index < text.length) {
        var character = text[index];

        if (braceLevel <= 0 &&
            text.slice(index, index + delimLength) === delimiter) {
            return index;
        } else if (character === "\\") {
            index++;
        } else if (character === "{") {
            braceLevel++;
        } else if (character === "}") {
            braceLevel--;
        }

        index++;
    }

    return -1;
};

var splitAtDelimiters = function(startData, leftDelim, rightDelim, display) {
    var finalData = [];

    for (var i = 0; i < startData.length; i++) {
        if (startData[i].type === "text") {
            var text = startData[i].data;

            var lookingForLeft = true;
            var currIndex = 0;
            var nextIndex;

            nextIndex = text.indexOf(leftDelim);
            if (nextIndex !== -1) {
                currIndex = nextIndex;
                finalData.push({
                    type: "text",
                    data: text.slice(0, currIndex)
                });
                lookingForLeft = false;
            }

            while (true) {
                if (lookingForLeft) {
                    nextIndex = text.indexOf(leftDelim, currIndex);
                    if (nextIndex === -1) {
                        break;
                    }

                    finalData.push({
                        type: "text",
                        data: text.slice(currIndex, nextIndex)
                    });

                    currIndex = nextIndex;
                } else {
                    nextIndex = findEndOfMath(
                        rightDelim,
                        text,
                        currIndex + leftDelim.length);
                    if (nextIndex === -1) {
                        break;
                    }

                    finalData.push({
                        type: "math",
                        data: text.slice(
                            currIndex + leftDelim.length,
                            nextIndex),
                        rawData: text.slice(
                            currIndex,
                            nextIndex + rightDelim.length),
                        display: display
                    });

                    currIndex = nextIndex + rightDelim.length;
                }

                lookingForLeft = !lookingForLeft;
            }

            finalData.push({
                type: "text",
                data: text.slice(currIndex)
            });
        } else {
            finalData.push(startData[i]);
        }
    }

    return finalData;
};

module.exports = splitAtDelimiters;

},{}]},{},[1])
(1)
});
;