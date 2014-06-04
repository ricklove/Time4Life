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
            var rootNodes = splitAndProcessParts(dd, text, 0, rootDef.children, 0);
            var rootNode = {
                type: "ROOT",
                value: "",
                valueNames: [],
                values: {},
                children: rootNodes
            };

            // Debug All
            rootNode._debugAll = "ROOT" + "\r\n\t" + rootNode.children.map(function (c) {
                return Told.Utils.replaceAll(c._debugAll, "\r\n", "\r\n\t");
            }).join("\r\n\t");

            rootNode._debugAll = rootNode._debugAll.trim();

            return {
                documentTextRaw: textRaw,
                documentTextNormalized: textNormalized,
                root: rootNode
            };
        }
        DSL.parseDsl = parseDsl;

        function splitAndProcessParts(dslDefinition, textPart, textIndexInDocument, defSiblings, variableBase) {
            if (textPart === "" || textPart === null) {
                return [];
            }

            var resolvedDefinitionInfos = resolveDefinitions(dslDefinition, defSiblings, variableBase);
            var acceptedMatches = findMatches(textPart, resolvedDefinitionInfos);
            var textRanges = findTextRanges(textPart, acceptedMatches, resolvedDefinitionInfos);
            var nodes = processTextRanges(textRanges, textPart, textIndexInDocument);

            // Go deeper
            nodes.forEach(function (n) {
                n.children = [];

                if (n.type === "UNKNOWN") {
                    n.valueNames = ["."];
                    n.values["."] = { value: n._matchedText, capture: n._textRange.matchInfo };
                    return;
                }

                if (n._childrenSubText !== "") {
                    if (n._definition.children.length === 0) {
                        // Handle '...' with no children
                        n.valueNames = ["."];
                        n.values["."] = { value: n._childrenSubText, capture: n._childrenSubTextRange.matchInfo };
                    } else {
                        // Handle normal children
                        n.children = splitAndProcessParts(dslDefinition, n._childrenSubText, n._childrenSubTextRange.index + textIndexInDocument, n._definition.children, n._definition.variableAdjustment);
                    }
                }
            });

            // Debug
            nodes.forEach(function (n) {
                var debug = n.type + ":" + n.valueNames.map(function (v) {
                    var val = n.values[v] !== undefined ? n.values[v].value : "";
                    return " " + v + "='" + val + "'";
                }).join(",");

                n._debug = debug;
                n._debugAll = debug;
            });

            // Debug All
            nodes.forEach(function (n) {
                n._debugAll = n._debugAll + "\r\n\t" + n.children.map(function (c) {
                    return Told.Utils.replaceAll(c._debugAll, "\r\n", "\r\n\t");
                }).join("\r\n\t");

                n._debugAll = n._debugAll.trim();
            });

            return nodes;
        }
        DSL.splitAndProcessParts = splitAndProcessParts;

        function resolveDefinitions(dslDefinition, defSiblings, variableBase) {
            // Get the sibling patterns
            var defTypes = defSiblings.map(function (s) {
                // Get the copy if it is defined
                var defSource;
                var variableAdjustement = 0;

                if (s.copyPatternName !== "") {
                    var mCopies = dslDefinition.roots.filter(function (r) {
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
                    definition: s,
                    type: s.name,
                    regexStr: regex,
                    regex: new RegExp(regex, "g"),
                    variableAdjustment: variableAdjustement,
                    isOpenEnded: defSource.isOpenEnded,
                    valueNames: defSource.targets,
                    children: defSource.children
                };
            });

            // Get post and pre catch alls
            var defTypesWithCatchAll = defTypes.map(function (d) {
                return {
                    defType: d,
                    isCatchAll: d.regexStr === "",
                    isOpenEnded: d.isOpenEnded,
                    preCatchAll: d,
                    postCatchAll: d
                };
            });

            var unknownCatchAll = {
                definition: null,
                type: "UNKNOWN",
                regexStr: "",
                regex: new RegExp("", "g"),
                variableAdjustment: 0,
                isOpenEnded: true,
                valueNames: ["."],
                children: []
            };

            defTypesWithCatchAll.forEach(function (d, i) {
                if (!d.isCatchAll) {
                    var cBefore = Told.Utils.sameType(d, null);
                    var cAfter = Told.Utils.sameType(d, null);

                    for (var iDefTypes = i; iDefTypes >= 0; iDefTypes--) {
                        if (defTypesWithCatchAll[iDefTypes].isCatchAll) {
                            cBefore = defTypesWithCatchAll[iDefTypes];
                        }
                    }

                    for (var iDefTypes = i; iDefTypes < defTypesWithCatchAll.length; iDefTypes++) {
                        if (defTypesWithCatchAll[iDefTypes].isCatchAll) {
                            cAfter = defTypesWithCatchAll[iDefTypes];
                        }
                    }

                    d.preCatchAll = (cBefore !== null) ? cBefore.defType : (cAfter !== null) ? cAfter.defType : unknownCatchAll;

                    d.postCatchAll = (d.isOpenEnded) ? d.defType : (cAfter !== null) ? cAfter.defType : (cBefore !== null) ? cBefore.defType : unknownCatchAll;
                }
            });

            return defTypesWithCatchAll;
        }

        function findMatches(text, resolvedDefInfos) {
            // Find all next match
            var searchIndex = 0;

            var getMatchWithIndex = function (r) {
                return Told.Utils.matchWithIndex(text, searchIndex, r);
            };

            // create blank of unknown type
            var acceptedMatches = [];

            while (searchIndex < text.length) {
                var nextMatches = resolvedDefInfos.filter(function (d) {
                    return !d.isCatchAll;
                }).map(function (d) {
                    return { resolvedDefInfo: d, matchInfo: getMatchWithIndex(d.defType.regex) };
                });

                var nMatch = null;

                nextMatches.filter(function (m) {
                    return m.matchInfo !== null;
                }).forEach(function (m) {
                    return nMatch = (nMatch === null || nMatch.matchInfo.index > m.matchInfo.index) ? m : nMatch;
                });

                if (nMatch === null) {
                    break;
                }

                acceptedMatches.push(nMatch);
                var nextIndex = nMatch.matchInfo.index + nMatch.matchInfo.length;

                if (searchIndex >= nextIndex) {
                    break;
                }

                searchIndex = nextIndex;
            }

            return acceptedMatches;
        }

        function findTextRanges(text, acceptedMatches, resolvedDefinitionInfos) {
            // Process the leftover text with the catch alls
            var textRanges = [];
            var am = acceptedMatches;

            if (am.length === 0) {
                // Pre text, no matches
                var tIndex = 0;
                var tLength = text.length;
                var tType2 = resolvedDefinitionInfos[0].preCatchAll;
                var tText = text;

                textRanges.push({
                    index: tIndex,
                    length: tLength,
                    isCatchAll: true,
                    matchInfo: { match: [tText], matchText: tText, index: tIndex, length: tLength, captures: [] },
                    defType: tType2,
                    wasHandled: false
                });
            } else {
                var iNext = 0;

                am.forEach(function (a, i) {
                    if (iNext < am[0].matchInfo.index) {
                        // Pre text, matches
                        var tIndex = iNext;
                        var tLength = am[0].matchInfo.index - iNext;
                        var tType = am[0].resolvedDefInfo.preCatchAll;
                        var tText = text.substr(tIndex, tLength);

                        textRanges.push({
                            index: tIndex,
                            length: tLength,
                            isCatchAll: true,
                            matchInfo: { match: [tText], matchText: tText, index: tIndex, length: tLength, captures: [] },
                            defType: tType,
                            wasHandled: false
                        });

                        iNext = am[0].matchInfo.index;
                    }

                    // Match text
                    var tr = {
                        index: a.matchInfo.index,
                        length: a.matchInfo.length,
                        isCatchAll: false,
                        matchInfo: a.matchInfo,
                        defType: a.resolvedDefInfo.defType,
                        wasHandled: false
                    };

                    textRanges.push(tr);
                    iNext = tr.index + tr.length;

                    // Post text
                    var tPostIndex = iNext;
                    var tPostLength = 0;
                    var tPostType = a.resolvedDefInfo.postCatchAll;

                    if (i + 1 < am.length) {
                        tPostLength = am[i + 1].matchInfo.index - iNext;
                    } else {
                        // Last match
                        tPostLength = text.length - iNext;
                    }

                    var tPostText = text.substr(tPostIndex, tPostLength);

                    if (tPostLength > 0) {
                        textRanges.push({
                            index: tPostIndex,
                            length: tPostLength,
                            isCatchAll: true,
                            matchInfo: { match: [tText], matchText: tText, index: tIndex, length: tLength, captures: [] },
                            defType: tPostType,
                            wasHandled: false
                        });

                        iNext = tPostIndex + tPostLength;
                    }
                });
            }

            return textRanges;
        }

        function processTextRanges(textRanges, text, textIndexInDocument) {
            // Process the text ranges with their definitions
            var nodes = [];

            textRanges.forEach(function (t, ti) {
                if (t.wasHandled) {
                    return;
                }

                var result = {
                    type: t.defType.type,
                    value: "",
                    valueNames: [],
                    values: {},
                    children: null,
                    _matchedText: t.matchInfo.matchText,
                    _indexInDocument: t.index + textIndexInDocument,
                    _textRange: t,
                    _definition: t.defType,
                    _childrenSubTextRange: null,
                    _childrenSubText: ""
                };

                if (!t.isCatchAll) {
                    var valueNames = t.defType.valueNames;
                    var values = {};
                    var cValues = t.matchInfo.captures;
                    var subCapture = null;

                    for (var iValue = 0; iValue < cValues.length; iValue++) {
                        var vName = valueNames[iValue];

                        if (vName === "...") {
                            subCapture = cValues[iValue];
                        } else {
                            values[vName] = { capture: cValues[iValue], value: cValues[iValue].matchText };
                        }
                    }

                    // Remove ...
                    valueNames = valueNames.filter(function (v) {
                        return v !== "..." && v !== ".";
                    });

                    // Set Values
                    result.valueNames = valueNames;
                    result.values = values;

                    // Set children
                    if (subCapture !== null) {
                        // Children are from captured text
                        result._childrenSubText = subCapture.matchText;
                        result._childrenSubTextRange = {
                            index: subCapture.index,
                            length: subCapture.length,
                            matchInfo: subCapture,
                            defType: null
                        };
                    }

                    if (t.defType.isOpenEnded) {
                        // Children are from open ended definition
                        var tNext = textRanges[ti + 1];
                        tNext.wasHandled = true;

                        if (t.defType !== tNext.defType) {
                            throw new Error("This should not be possible: Open ended definitions should be the only possible definition in the next text range");
                        }

                        var cSubIndex = tNext.index;
                        var cSubLength = tNext.length;
                        var cSubText = text.substr(cSubIndex, cSubLength);

                        result._childrenSubText = cSubText;
                        result._childrenSubTextRange = {
                            index: cSubIndex,
                            length: cSubLength,
                            matchInfo: { matchText: cSubText, index: cSubIndex, length: cSubLength, match: [cSubText], captures: [] },
                            defType: null
                        };
                    }
                } else {
                    // Children are from capture all
                    var cSubIndex = t.index;
                    var cSubLength = t.length;
                    var cSubText = text.substr(cSubIndex, cSubLength);

                    result._childrenSubText = cSubText;
                    result._childrenSubTextRange = {
                        index: cSubIndex,
                        length: cSubLength,
                        matchInfo: { matchText: cSubText, index: cSubIndex, length: cSubLength, match: [cSubText], captures: [] },
                        defType: null
                    };
                }

                nodes.push(result);
                t.wasHandled = true;
            });

            return nodes;
        }
    })(Told.DSL || (Told.DSL = {}));
    var DSL = Told.DSL;
})(Told || (Told = {}));
