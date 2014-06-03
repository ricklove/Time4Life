/// <reference path="Told.Utils.ts" />
var Told;
(function (Told) {
    (function (DSL) {
        

        

        function loadDslDefinition(documentUrl, onLoaded, onError) {
            var url = documentUrl;

            Told.Utils.loadTextFile(documentUrl, function (text) {
                var def = parseDslDefinition(text);
                onLoaded(def);
            }, onError);
        }
        DSL.loadDslDefinition = loadDslDefinition;

        function parseDslDefinition(documentText) {
            var docText = documentText.replace(/\r?\n/g, "\r\n");
            var aParts = docText.split("\r\n# REPLACEMENTS:");
            var bParts = aParts[1].split("\r\n# PATTERNS:");

            var replacementLines = bParts[0].split("\r\n");
            var entryLines = bParts[1].split("\r\n");

            // Parse each replacement
            var rxReplacement = /^(.*)=(.*)/;
            var replacements = replacementLines.filter(function (l) {
                return l.indexOf("=") > 0;
            }).map(function (l) {
                var m = l.match(rxReplacement);
                return { input: m[1], output: m[2] };
            });

            replacements = replacements.sort(function (a, b) {
                return -(a.input.length - b.input.length);
            });

            // Parse each pattern
            // - header: $[ (\word) : (\word) ] (\line)\r {{ type, name, title }}
            // - part: \n#{@1}[^#]...
            //	  - content: [partContent]
            //	  - part: [part(+1)]
            var rxMainPattern = Told.Utils.expandSimpleRegex(/^( )- (`word) : (`not'{{'*) (?:{{ (`not'}}'*) }})? $/.source);

            // Copy pattern
            // [partContent]
            // [part(+1)]
            var rxCopyPattern = new RegExp(Told.Utils.expandSimpleRegex(/^ \[ (`word) (?:\( \+ (\d) \))? \] $/.source));

            // Regex variables
            // \n#{@1}[^#]
            var rxRegexVariable = /@\d/g;

            var entries = entryLines.filter(function (l) {
                return l.trim()[0] === "-";
            }).map(function (l) {
                var m = l.match(rxMainPattern);
                var indent = m[1];
                var name = m[2].trim();
                var patternRaw = m[3].trim();
                var targetsRaw = (m[4] || "").trim();

                // Normal
                var regex = "";
                var isOpenEnded = false;
                var targets = [];
                var regexVariables = [];

                // CopyPattern
                var copyPatternName = "";
                var copyPatternInput = null;

                // Children
                var indentLevel = indent.replace(/\t/g, "    ").length;

                // Sub pattern matching
                var mCopyPattern = patternRaw.trim().match(rxCopyPattern);

                // TODO: Fix priority ... check first
                // ... can happen with targets
                if (targetsRaw !== "") {
                    // Regex pattern
                    regex = patternRaw;
                    targets = targetsRaw.split(",").map(function (t) {
                        return t.trim();
                    });
                } else if (mCopyPattern !== null) {
                    // CopyPattern
                    copyPatternName = mCopyPattern[1];
                    copyPatternInput = parseInt(mCopyPattern[2]);
                    copyPatternInput = isNaN(copyPatternInput) ? null : copyPatternInput;
                } else {
                    // Regex pattern with ... target
                    var rxOpenEnded = /\.\.\.$/;

                    if (patternRaw.trim().match(rxOpenEnded)) {
                        // Open ended
                        regex = patternRaw.trim().replace(rxOpenEnded, "");
                        isOpenEnded = true;
                    } else {
                        // Lazy
                        regex = patternRaw.replace(/\.\.\./g, "(?:.*?)");
                    }

                    targets = ["..."];
                }

                // Do replacements on the regex
                if (regex !== "") {
                    var text = regex;

                    replacements.forEach(function (r) {
                        text = Told.Utils.replaceAll(text, r.input, r.output);
                    });

                    regex = text;
                }

                // Find regex variables
                if (regex !== "") {
                    var mVars = regex.match(rxRegexVariable);

                    if (mVars !== null) {
                        for (var iMatch = 0; iMatch < mVars.length; iMatch++) {
                            var mVar = mVars[iMatch];

                            if (!regexVariables.some(function (v) {
                                return v.text === mVar;
                            })) {
                                regexVariables.push({
                                    defaultValue: parseInt(mVar.substr(1)),
                                    text: mVar
                                });
                            }
                        }
                    }
                }

                if (regex !== "") {
                    // Test it
                    var rTest = new RegExp(regex);
                }

                return {
                    rawText: l,
                    name: name,
                    patternRaw: patternRaw,
                    targetsRaw: targetsRaw,
                    regex: regex,
                    isOpenEnded: isOpenEnded,
                    targets: targets,
                    regexVariables: regexVariables,
                    copyPatternName: copyPatternName,
                    copyPatternInput: copyPatternInput,
                    indentLevel: indentLevel,
                    children: [],
                    parent: null
                };
            });

            // Assign the children to their parents
            var lastEntry = null;

            entries.forEach(function (e) {
                if (lastEntry !== null) {
                    if (e.indentLevel > lastEntry.indentLevel) {
                        // Child of last
                        e.parent = lastEntry;
                    } else if (e.indentLevel === lastEntry.indentLevel) {
                        // Sibling to last
                        e.parent = lastEntry.parent;
                    } else {
                        while (e.indentLevel < lastEntry.indentLevel) {
                            lastEntry = lastEntry.parent;
                        }

                        if (e.indentLevel > lastEntry.indentLevel) {
                            // Child (This should not happen unless the list is malformed)
                            e.parent = lastEntry;
                        } else if (e.indentLevel === lastEntry.indentLevel) {
                            // Sibling
                            e.parent = lastEntry.parent;
                        }
                    }

                    if (e.parent !== null) {
                        e.parent.children.push(e);
                    }
                }

                lastEntry = e;
            });

            var roots = entries.filter(function (e) {
                return e.parent === null;
            });

            // Create debug strings
            entries.forEach(function (e) {
                var indentation = (function () {
                    var s = "";
                    for (var i = 0; i < e.indentLevel; i++) {
                        s += " ";
                    }
                    return s;
                })();

                var regexStr = e.regex;

                e.regexVariables.forEach(function (v) {
                    return regexStr = Told.Utils.replaceAll(regexStr, v.text, "#" + v.defaultValue);
                });

                var r = " " + regexStr + (e.isOpenEnded ? "..." : "") + (e.targets.length > 0 ? (" {{" + e.targets.join(",") + "}}") : "");

                var c = " [" + e.copyPatternName + (e.copyPatternInput !== null ? ("(" + e.copyPatternInput + ")") : "") + "]";

                e._debug = "" + indentation + "-" + e.name + ":" + (r.trim().length > 0 ? r : c);
            });

            var writeChildrenDebug = function (e, indent) {
                if (e === null) {
                    return;
                }
                return e.children.map(function (c) {
                    return indent + c._debug.trim() + "\r\n" + writeChildrenDebug(c, indent + "\t");
                }).join("");
            };

            var d = roots.map(function (e) {
                return e._debug.trim() + "\r\n" + writeChildrenDebug(e, "\t");
            }).join("\r\n");

            // Return definition
            return {
                _debug: d,
                replacements: replacements,
                entries: entries,
                roots: roots
            };
        }
        DSL.parseDslDefinition = parseDslDefinition;
    })(Told.DSL || (Told.DSL = {}));
    var DSL = Told.DSL;
})(Told || (Told = {}));
