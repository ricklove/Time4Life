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
            var splitAndProcessParts = function (textPart, defSiblings, variableBase) {
                // Get the sibling patterns
                var defTypes = defSiblings.map(function (s) {
                    // Get the copy if it is defined
                    var defSource;
                    var variableAdjustement = 0;

                    if (s.copyPatternName !== "") {
                        var mCopies = dd.roots.filter(function (r) {
                            return r.name === s.copyPatternName;
                        });

                        if (mCopies.length > 1) {
                            throw "Definition has multiple root entities called '" + s.copyPatternName + "'";
                        } else if (mCopies.length < 1) {
                            throw "Definition has no root entities called '" + s.copyPatternName + "'";
                        }

                        defSource = mCopies[0];
                        variableAdjustement = s.copyPatternInput || 0;
                    } else {
                        defSource = s;
                    }

                    // Do variable replacements
                    var regex = defSource.regex;
                    defSource.regexVariables.forEach(function (v) {
                        return regex = Told.Utils.replaceAll(regex, v.text, "" + (v.defaultValue + variableBase + variableAdjustement));
                    });

                    return {
                        type: s.name,
                        regex: regex,
                        variableAdjustment: variableAdjustement,
                        isOpenEnded: defSource.isOpenEnded,
                        valueNames: defSource.targets,
                        children: defSource.children
                    };
                });

                // Create the split regex
                // TODO: Handle the "..." catch all
                var r = "(" + defTypes.map(function (p) {
                    return p.regex;
                }).join("|") + ")";

                // This will split like:
                // PRETEXT, M1, MIDTEXT, M2, MIDTEXT, M3, POSTTEXT
                var parts = textPart.split(new RegExp(r));
                var partWasUsed = [];

                var nodes = [];

                for (var iPart = 1; iPart < parts.length; iPart += 2) {
                    var preText = parts[iPart - 1];
                    var matchText = parts[iPart];
                    var postText = parts[iPart + 1];

                    var mType = defTypes.filter(function (t) {
                        return matchText.match(t.regex) !== null;
                    })[0];

                    if (!partWasUsed[iPart - 1]) {
                        partWasUsed[iPart - 1] = true;
                    } else {
                        preText = "";
                    }

                    partWasUsed[iPart] = true;

                    if (mType.isOpenEnded) {
                        partWasUsed[iPart + 1] = true;
                    } else {
                        postText = "";
                    }

                    var mValues = matchText.match(mType.regex);

                    // Skip the whole match
                    mValues.shift();

                    var valueNames = mType.valueNames;
                    var values = {};
                    var subText = postText;

                    for (var iMatch = 0; iMatch < mValues.length; iMatch++) {
                        var vName = valueNames[iMatch];
                        if (vName !== "...") {
                            values[vName] = mValues[iMatch];
                        } else {
                            subText = mValues[iMatch];
                        }
                    }

                    nodes.push({
                        _preText: preText,
                        rawText: preText + matchText + postText,
                        type: mType.type,
                        valueNames: valueNames,
                        values: values,
                        children: splitAndProcessParts(subText, mType.children, mType.variableAdjustment)
                    });
                }

                return nodes;
            };

            // Start with "ROOT" (ignore its pattern)
            var rootDef = dd.roots.filter(function (r) {
                return r.name === "ROOT";
            })[0];
            var rootNodes = splitAndProcessParts(text, rootDef.children, 0);
            var rootNode = {
                rawText: text,
                type: "ROOT",
                children: rootNodes,
                valueNames: [],
                values: {}
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
