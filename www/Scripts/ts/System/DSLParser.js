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

            // Start with "ROOT" (ignore its pattern)
            var rootDef = dd.roots.filter(function (r) {
                return r.name === "ROOT";
            })[0];
            var rootNodes = splitAndProcessParts(dd, text, rootDef.children, 0);
            var rootNode = {
                rawText: text,
                type: "ROOT",
                _childrenText: text,
                _childrenDefs: rootDef.children,
                _childrenVariableAdjustement: 0,
                childrenNodes: rootNodes,
                value: "",
                valueNames: [],
                values: {}
            };

            // Debug All
            rootNode._debugAll = "ROOT" + "\r\n\t" + rootNode.childrenNodes.map(function (c) {
                return Told.Utils.replaceAll(c._debugAll, "\r\n", "\r\n\t");
            }).join("\r\n\t");

            rootNode._debugAll = rootNode._debugAll.trim();

            // Automatic breakpoint
            //throw "breakdance";
            return {
                documentTextRaw: textRaw,
                documentTextNormalized: textNormalized,
                root: rootNode
            };
        }
        DSL.parseDsl = parseDsl;

        // Use the definition to parse the document
        function splitAndProcessParts(dslDefinition, textPart, defSiblings, variableBase) {
            var dd = dslDefinition;

            if (textPart === "") {
                return [];
            }

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
            // If a catch all is first, it will catch the pretext
            // If a catch all is last, it will only catch left over posttext
            // If there are still left over posttext, the first catch all will get it
            var captureAllDefs = defTypes.filter(function (d) {
                return d.regex === "" && d.isOpenEnded;
            });
            var matchingDefs = defTypes.filter(function (d) {
                return d.regex !== "" || !d.isOpenEnded;
            });

            var r = "(" + matchingDefs.map(function (p) {
                return p.regex;
            }).join("|") + ")";

            // This will split like:
            // parts=           PRETEXT,     MIDTEXT,    MIDTEXT,    POSTTEXT
            // exactMatches=    M1,          M2,         M3
            // replace trick to find exact matches
            var parts = [];
            var exactMatches = [];
            var lastOffset = 0;

            textPart.replace(new RegExp(r, "g"), function () {
                var m = arguments[0];
                var offset = arguments[arguments.length - 2];

                parts.push({ text: textPart.substr(lastOffset, offset - lastOffset) });
                exactMatches.push(m);

                lastOffset = offset + m.length;

                return m;
            });

            parts.push({ text: textPart.substr(lastOffset) });

            var nodes = [];

            // Find the specific def that was matched for each part
            var addCaptureAllNode = function (part, isFirst) {
                // Any parts not used will be matched to capture all:
                // First leftover will match first capture all
                // Other leftovers will match last capture all
                if (part.wasUsed || captureAllDefs.length === 0 || part.text === "" || (part.text.length < 2 && part.text.trim().length === 0)) {
                    return;
                }

                var caDef = isFirst ? captureAllDefs[0] : captureAllDefs[captureAllDefs.length - 1];

                nodes.push({
                    rawText: part.text,
                    type: caDef.type,
                    valueNames: [],
                    values: [],
                    value: "",
                    _childrenText: part.text,
                    _childrenDefs: caDef.children,
                    _childrenVariableAdjustement: caDef.variableAdjustment,
                    childrenNodes: null
                });
            };

            for (var iMatch = 0; iMatch < exactMatches.length; iMatch++) {
                var prePart = parts[iMatch];
                var matchText = exactMatches[iMatch];
                var postPart = parts[iMatch + 1];
                var postText = postPart.text;

                var mType = matchingDefs.filter(function (t) {
                    return matchText.match(t.regex) !== null;
                })[0];

                if (mType.isOpenEnded) {
                    postPart.wasUsed = true;
                } else {
                    postText = "";
                }

                // DEBUG
                if (mType.type === "text") {
                    var breakdance = true;
                }

                // Get the actual match
                var mValues = matchText.match(mType.regex);

                if (mValues.length > 1) {
                    var breakdance = true;
                }

                // Skip the whole match
                mValues.shift();

                var valueNames = mType.valueNames;
                var value = "";
                var values = {};
                var subText = postText;

                for (var iValue = 0; iValue < mValues.length; iValue++) {
                    var vName = valueNames[iValue];

                    if (vName === "...") {
                        subText = mValues[iValue];
                        //} else if (vName === ".") {
                        //    value = mValues[iValue];
                    } else {
                        values[vName] = mValues[iValue];
                    }
                }

                // Remove ...
                valueNames = valueNames.filter(function (v) {
                    return v !== "...";
                }); //&& v !== ".");

                addCaptureAllNode(prePart, iMatch === 0);

                nodes.push({
                    rawText: matchText + postText,
                    type: mType.type,
                    valueNames: valueNames,
                    value: value,
                    values: values,
                    _childrenText: subText,
                    _childrenDefs: mType.children,
                    _childrenVariableAdjustement: mType.variableAdjustment,
                    childrenNodes: null
                });

                addCaptureAllNode(postPart, false);
                //throw "breakdance";
            }

            if (parts.length === 1) {
                addCaptureAllNode(parts[0], true);
            }

            // Go deeper
            nodes.forEach(function (n) {
                if (n.type === "text") {
                    var breakdance = true;
                }

                // Handle '...' with no children
                if (n._childrenDefs.length === 0) {
                    n.value = n._childrenText;
                    n.childrenNodes = [];
                } else {
                    n.childrenNodes = splitAndProcessParts(dd, n._childrenText, n._childrenDefs, n._childrenVariableAdjustement);
                }
            });

            // Debug
            nodes.forEach(function (n) {
                var debug = n.type + ":" + (n.value !== "" ? (" '" + n.value + "'") : "") + n.valueNames.map(function (v) {
                    return " " + v + "='" + (n.values[v] || "") + "'";
                }).join(",");

                n._debug = debug;
                n._debugAll = debug;
            });

            // Debug All
            nodes.forEach(function (n) {
                n._debugAll = n._debugAll + "\r\n\t" + n.childrenNodes.map(function (c) {
                    return Told.Utils.replaceAll(c._debugAll, "\r\n", "\r\n\t");
                }).join("\r\n\t");

                n._debugAll = n._debugAll.trim();
            });

            //throw "breakdance";
            return nodes;
        }
        DSL.splitAndProcessParts = splitAndProcessParts;
    })(Told.DSL || (Told.DSL = {}));
    var DSL = Told.DSL;
})(Told || (Told = {}));
