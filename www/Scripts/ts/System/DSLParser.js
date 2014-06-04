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
                _rawText: text,
                _index: 0,
                _indexInSubText: 0,
                _length: text.length,
                type: "ROOT",
                _definition: null,
                _childrenText: text,
                _childrenTextIndex: 0,
                _childrenTextIndexInSubText: 0,
                _childrenDefs: rootDef.children,
                _childrenVariableAdjustment: 0,
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
        function splitAndProcessParts(dslDefinition, textPart, textIndexInDocument, defSiblings, variableBase) {
            var dd = dslDefinition;

            if (textPart === "" || textPart === null) {
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

            // Find all next match
            var text = textPart;
            var searchIndex = 0;

            var getMatchWithIndex = function (r) {
                r.lastIndex = searchIndex;
                var m = r.exec(text);

                if (m === null) {
                    return null;
                }
                ;

                var length = m[0].length;
                var index = r.lastIndex - length;
                r.lastIndex = 0;

                return { match: m, matchText: m[0], index: index, length: length };
            };

            // create blank of unknown type
            var acceptedMatches = Told.Utils.sameType([{
                    defTypeWithCatchAll: defTypesWithCatchAll[0],
                    matchInfo: getMatchWithIndex(defTypesWithCatchAll[0].defType.regex)
                }], []);

            while (searchIndex < text.length) {
                var nextMatches = defTypesWithCatchAll.filter(function (d) {
                    return !d.isCatchAll;
                }).map(function (d) {
                    return { defTypeWithCatchAll: d, matchInfo: getMatchWithIndex(d.defType.regex) };
                });

                var nMatch = Told.Utils.sameType(nextMatches[0], null);

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

            // Process the leftover text with the catch alls
            var textRanges = Told.Utils.sameType([{
                    index: 0,
                    length: 0,
                    isCatchAll: false,
                    match: [""],
                    defType: defTypes[0],
                    wasHandled: false
                }], []);

            var iNext = 0;
            var am = acceptedMatches;

            // Pre text (this will only happen before the first index)
            if (am.length > 0) {
                if (iNext < am[0].matchInfo.index) {
                    var tIndex = iNext;
                    var tLength = am[0].matchInfo.index - iNext;
                    var tType = am[0].defTypeWithCatchAll.preCatchAll;

                    textRanges.push({
                        index: tIndex,
                        length: tLength,
                        isCatchAll: true,
                        match: [text.substr(tIndex, tLength)],
                        defType: tType,
                        wasHandled: false
                    });

                    iNext = am[0].matchInfo.index;
                }
            } else {
                var tIndex = iNext;
                var tLength = text.length;
                var tType2 = defTypesWithCatchAll[0].preCatchAll;

                textRanges.push({
                    index: tIndex,
                    length: tLength,
                    isCatchAll: true,
                    match: [text.substr(tIndex, tLength)],
                    defType: tType2,
                    wasHandled: false
                });
            }

            am.forEach(function (a, i) {
                // Match text
                var tr = {
                    index: a.matchInfo.index,
                    length: a.matchInfo.length,
                    isCatchAll: false,
                    match: a.matchInfo.match,
                    defType: a.defTypeWithCatchAll.defType,
                    wasHandled: false
                };

                if (a.defTypeWithCatchAll.defType.isOpenEnded) {
                }

                textRanges.push(tr);
                iNext = tr.index + tr.length;

                //if (!a.defTypeWithCatchAll.defType.isOpenEnded) {
                // Post text
                var tPostIndex = iNext;
                var tPostLength = 0;
                var tPostType = a.defTypeWithCatchAll.postCatchAll;

                if (i + 1 < am.length) {
                    tPostLength = am[i + 1].matchInfo.index - iNext;
                } else {
                    // Last match
                    tPostLength = text.length - iNext;
                }

                if (tPostLength > 0) {
                    textRanges.push({
                        index: tPostIndex,
                        length: tPostLength,
                        isCatchAll: true,
                        match: [text.substr(tPostIndex, tPostLength)],
                        defType: tPostType,
                        wasHandled: false
                    });

                    iNext = tPostIndex + tPostLength;
                }
                //}
            });

            // Process the text ranges with their definitions
            var nodes = [];

            textRanges.forEach(function (t, ti) {
                if (t.wasHandled) {
                    return null;
                }

                var result = {
                    _debug: "",
                    _debugAll: "",
                    _rawText: t.match[0],
                    _index: t.index + textIndexInDocument,
                    _indexInSubText: t.index,
                    _length: t.length,
                    //Type is the definition name that matches
                    _definition: t.defType.definition,
                    type: t.defType.type,
                    // Children are sub definition matches
                    _childrenText: null,
                    _childrenTextIndexInSubText: null,
                    _childrenTextIndex: null,
                    _childrenDefs: t.defType.children,
                    _childrenVariableAdjustment: t.defType.variableAdjustment,
                    childrenNodes: null,
                    // Values are dynamically created
                    value: "",
                    valueNames: [],
                    values: {}
                };

                result._childrenDefs = t.defType.children;
                result._childrenVariableAdjustment = t.defType.variableAdjustment;

                if (!t.isCatchAll) {
                    var valueNames = t.defType.valueNames;
                    var values = {};
                    var mValues = t.match.slice(1);
                    var subText = "";

                    for (var iValue = 0; iValue < mValues.length; iValue++) {
                        var vName = valueNames[iValue];

                        if (vName === "...") {
                            subText = mValues[iValue];
                        } else {
                            values[vName] = mValues[iValue];
                        }
                    }

                    // Remove ...
                    valueNames = valueNames.filter(function (v) {
                        return v !== "..." && v !== ".";
                    });

                    result.valueNames = valueNames;
                    result.values = values;

                    if (subText !== "") {
                        result._childrenText = subText;
                        result._childrenTextIndexInSubText = t.match.indexOf(subText) + t.index;
                        result._childrenTextIndex = result._childrenTextIndexInSubText + textIndexInDocument;
                    }

                    if (t.defType.isOpenEnded) {
                        var tNext = textRanges[ti + 1];
                        tNext.wasHandled = true;
                        result._childrenText = text.substr(tNext.index, tNext.length);
                        result._childrenTextIndexInSubText = tNext.index;
                        result._childrenTextIndex = result._childrenTextIndexInSubText + textIndexInDocument;
                    }
                } else {
                    result._childrenText = text.substr(t.index, t.length);
                    result._childrenTextIndexInSubText = t.index;
                    result._childrenTextIndex = result._childrenTextIndexInSubText + textIndexInDocument;
                }

                nodes.push(result);
                t.wasHandled = true;
            });

            // Go deeper
            nodes.forEach(function (n) {
                n.childrenNodes = [];

                if (n.type === "UNKNOWN") {
                    n.value = n._rawText;
                    return;
                }

                if (n._childrenText !== null) {
                    if (n.type === "text") {
                        var breakdance = true;
                    }

                    // Handle '...' with no children
                    if (n._childrenDefs.length === 0) {
                        n.value = n._childrenText;
                        n.childrenNodes = [];
                    } else {
                        n.childrenNodes = splitAndProcessParts(dd, n._childrenText, n._childrenTextIndex, n._childrenDefs, n._childrenVariableAdjustment);
                    }
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
