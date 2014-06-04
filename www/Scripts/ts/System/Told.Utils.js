/// <reference path="../../typings/jquery/jquery.d.ts" />
var Told;
(function (Told) {
    (function (Utils) {
        // ---------------------------------------
        // Typescript
        // ---------------------------------------
        function sameType(targetType, defaultValue) {
            var t = targetType;
            t = defaultValue;
            return t;
        }
        Utils.sameType = sameType;

        

        function matchWithIndex(text, startIndex, r) {
            r.lastIndex = startIndex;
            var m = r.exec(text);

            if (m === null) {
                return null;
            }
            ;

            var length = m[0].length;
            var index = r.lastIndex - length;
            r.lastIndex = 0;

            var match = [];
            m.forEach(function (mText) {
                return match.push(mText);
            });

            // Find capture indices
            var captures = [];
            var nextIndex = 0;

            for (var i = 1; i < m.length; i++) {
                var mText = m[i];

                if (mText === undefined) {
                    mText = "";
                }

                var c = {
                    matchText: mText,
                    length: mText.length,
                    index: mText !== "" ? m[0].indexOf(m[i], nextIndex) : -1,
                    match: [m[i]],
                    captures: []
                };

                // Don't increment index, because sub captures can be at the same place (but not behind)
                nextIndex = c.index;
                captures.push(c);
            }

            return { match: match, matchText: m[0], index: index, length: length, captures: captures };
        }
        Utils.matchWithIndex = matchWithIndex;
        ;

        function expandSimpleRegex(simpleRegex) {
            var expansions = [
                { simple: /`not'([^']*)'/g, actual: "(?:(?!$1).)" },
                { simple: /`word/g, actual: "\\w+" },
                { simple: / /g, actual: "\\s*" }
            ];

            var r = simpleRegex;

            expansions.forEach(function (x) {
                r = r.replace(x.simple, x.actual);
            });

            return r;
        }
        Utils.expandSimpleRegex = expandSimpleRegex;

        function replaceAll(text, find, replace) {
            return text.replace(new RegExp(escapeRegExp(find), 'g'), replace);
        }
        Utils.replaceAll = replaceAll;

        function escapeRegExp(text) {
            return text.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
        }
        Utils.escapeRegExp = escapeRegExp;

        // ---------------------------------------
        // File Loading
        // ---------------------------------------
        function loadAllTextFiles(fileUrls, onFileLoaded, onFileError, onAllFilesFinishedLoading) {
            var loadCount = 0;

            var markFileAsLoaded = function () {
                loadCount++;

                if (loadCount === fileUrls.length) {
                    // Don't let an exception block this from being called
                    setTimeout(onAllFilesFinishedLoading, 0);
                }
            };

            fileUrls.forEach(function (url) {
                var onLoaded = function (data) {
                    markFileAsLoaded();
                    onFileLoaded(url, data);
                };

                var onError = function (message) {
                    markFileAsLoaded();
                    onFileError(url, message);
                };

                loadTextFile(url, onLoaded, onError);
            });
        }
        Utils.loadAllTextFiles = loadAllTextFiles;

        function loadTextFile(url, onLoaded, onError) {
            $.ajax(url, {
                dataType: "text",
                cache: true,
                success: function (data) {
                    onLoaded(data);
                },
                error: function (jqXHR, textStatus, errorThrow) {
                    if (onError) {
                        onError(textStatus + ": " + errorThrow);
                    }
                }
            });
        }
        Utils.loadTextFile = loadTextFile;
    })(Told.Utils || (Told.Utils = {}));
    var Utils = Told.Utils;
})(Told || (Told = {}));
