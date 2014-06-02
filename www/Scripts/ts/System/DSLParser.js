/// <reference path="Told.Utils.ts" />
/// <reference path="DSLDefinitionParser.ts" />
var Told;
(function (Told) {
    (function (DSL) {
        function loadDsl(documentUrl, dslDefinition, onLoaded, onError) {
            var url = documentUrl;

            Told.Utils.loadTextFile(documentUrl, function (text) {
                var dsl = parseDsl(text, dslDefinition);
                onLoaded(dsl);
            }, onError);
        }
        DSL.loadDsl = loadDsl;

        function parseDsl(documentText, dslDefinition) {
            var dd = dslDefinition;
            var textRaw = documentText;

            // Normalize document
            var text = documentText;

            // Add blank lines at borders
            text = "\r\n" + text + "\r\n";

            text = text.replace(/\r?\n/g, "\r\n").replace(/\r\n\s*\/\/[^\r]*/g, "").replace(/\r\n(\s*\r\n)+/g, "\r\n\r\n");

            var textNormalized = text;

            // Use the definition to parse the document
            var splitAndProcessParts = function (textPart, defSiblings) {
                // Create regex from siblings
                var r = "";

                defSiblings.forEach(function (s) {
                    // Get the copy if it is defined
                    var regexSource;

                    if (s.copyPatternName !== "") {
                        var mCopies = dd.roots.filter(function (r) {
                            return r.name === s.copyPatternName;
                        });

                        if (mCopies.length > 1) {
                            throw "Definition has multiple root entities called '" + s.copyPatternName + "'";
                        } else if (mCopies.length < 1) {
                            throw "Definition has no root entities called '" + s.copyPatternName + "'";
                        }

                        regexSource = mCopies[0];
                    } else {
                        regexSource = s;
                    }

                    throw "Not Implemented";
                });

                // This will split like:
                // PRETEXT, M1, MIDTEXT, M2, MIDTEXT, M3, POSTTEXT
                var parts = textPart.split(new RegExp(r));

                throw "Not Implemented";
            };

            // Start with "ROOT" (ignore its pattern)
            var rootDef = dd.roots.filter(function (r) {
                return r.name === "ROOT";
            })[0];
            var rootNodes = splitAndProcessParts(text, rootDef.children);
            var rootNode = {
                rawText: text,
                children: rootNodes,
                variableNames: []
            };

            throw "breakdance";

            return {
                documentTextRaw: textRaw,
                documentTextNormalized: textNormalized,
                root: rootNode
            };
        }
        DSL.parseDsl = parseDsl;
    })(Told.DSL || (Told.DSL = {}));
    var DSL = Told.DSL;
})(Told || (Told = {}));
