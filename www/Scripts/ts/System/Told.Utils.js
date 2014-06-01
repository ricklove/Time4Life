/// <reference path="../../typings/jquery/jquery.d.ts" />
var Told;
(function (Told) {
    (function (Utils) {
        // ---------------------------------------
        // Regex
        // ---------------------------------------
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
