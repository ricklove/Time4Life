/// <reference path="Told.Utils.ts" />

module Told.DSL {

    export interface IDslDefinition {
        _debug?: string;
        replacements: IReplacement[];
        entries: IDslDefinitionEntry[];
        roots: IDslDefinitionEntry[];
    }

    // Replacement
    // \t=(?:\t| {4})
    export interface IReplacement {
        input: string;
        output: string;
    }

    // DefinitionEntry
    // - header: $[ (\word) : (\word) ] (\line)\r {{ type, name, title }}
    // - part: \n#{@1}[^#]...
    //	  - content: [partContent] 
    //	  - part: [part(+1)]
    export interface IDslDefinitionEntry {
        _debug?: string;

        rawText: string;
        name: string;
        patternRaw: string;
        targetsRaw: string;

        // Normal
        regex: string;
        isOpenEnded: boolean;
        targets: string[];

        // CopyPattern
        copyPatternName: string;
        copyPatternInput: string;

        // Children
        indentLevel: number;
        children: IDslDefinitionEntry[];
        parent: IDslDefinitionEntry;
    }


    export function loadDslDefinition(documentUrl: string, onLoaded: (definition: IDslDefinition) => void, onError: (message: string) => void) {
        var url = documentUrl;

        Told.Utils.loadTextFile(documentUrl, text=> { return parseDslDefinition(text); }, onError);
    }

    export function parseDslDefinition(documentText: string): IDslDefinition {

        var docText = documentText.replace(/\r?\n/g, "\r\n");
        var aParts = docText.split("\r\n# REPLACEMENTS:");
        var bParts = aParts[1].split("\r\n# PATTERNS:");

        var replacementLines = bParts[0].split("\r\n");
        var entryLines = bParts[1].split("\r\n");

        // Parse each replacement
        var rxReplacement = /^(.*)=(.*)/;
        var replacements: IReplacement[] = replacementLines.filter(l=> l.indexOf("=") > 0).map(l=> {
            var m = l.match(rxReplacement);
            return { input: m[1], output: m[2] };
        });

        // I'm not sure why this is sorting the longest first
        replacements = replacements.sort((a, b) => -(a.input.length - b.input.length));

        // Parse each pattern
        // - header: $[ (\word) : (\word) ] (\line)\r {{ type, name, title }}
        // - part: \n#{@1}[^#]...
        //	  - content: [partContent] 
        //	  - part: [part(+1)]
        var rxMainPattern = Told.Utils.expandSimpleRegex(
            /^( )- (`word) : (`not'{{'*) (?:{{ (`not'}}'*) }})? $/.source
            );

        // Copy pattern
        // [partContent]
        // [part(+1)]
        var rxCopyPattern = new RegExp(Told.Utils.expandSimpleRegex(
            /^ \[ (`word) (?:\( (\+\d) \))? \] $/.source
            ));

        var entries: IDslDefinitionEntry[] = entryLines.filter(l=> l.trim()[0] === "-").map(l=> {
            var m = l.match(rxMainPattern);
            var indent = m[1];
            var name = m[2].trim();
            var patternRaw = m[3].trim();
            var targetsRaw = (m[4] || "").trim();


            // Normal
            var regex: string = "";
            var isOpenEnded: boolean = false;
            var targets: string[] = [];

            // CopyPattern
            var copyPatternName: string = "";
            var copyPatternInput: string = "";

            // Children
            var indentLevel = indent.replace(/\t/g, "    ").length;

            // Sub pattern matching
            var mCopyPattern = patternRaw.trim().match(rxCopyPattern);


            if (targetsRaw !== "") {
                // Regex pattern
                regex = patternRaw;
                targets = targetsRaw.split(",").map(t=> t.trim());

            } else if (mCopyPattern !== null) {
                // CopyPattern
                copyPatternName = mCopyPattern[1];
                copyPatternInput = mCopyPattern[2] || "";

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

                replacements.forEach(r=> {
                    text = Told.Utils.replaceAll(text, r.input, r.output);
                });

                regex = text;
            }

            return {
                rawText: l,
                name: name,
                patternRaw: patternRaw,
                targetsRaw: targetsRaw,

                regex: regex,
                isOpenEnded: isOpenEnded,
                targets: targets,

                copyPatternName: copyPatternName,
                copyPatternInput: copyPatternInput,

                indentLevel: indentLevel,
                children: [],
                parent: null
            };
        });

        // Create debug string
        entries.forEach(e=> {
            var indentation = (function () {
                var s = "";
                for (var i = 0; i < e.indentLevel; i++) {
                    s += " ";
                }
                return s;
            })();

            var r = " " + e.regex
                + (e.isOpenEnded ? "..." : "")
                + (e.targets.length > 0 ? (" {{" + e.targets.join(",") + "}}") : "");


            var c = " [" + e.copyPatternName
                + (e.copyPatternInput !== "" ? ("(" + e.copyPatternInput + ")") : "")
                + "]";

            e._debug = ""
            + indentation
            + "-" + e.name
            + ":" + (r.trim().length > 0 ? r : c);

        });

        // Assign the children to their parents
        var lastEntry: IDslDefinitionEntry = null;

        entries.forEach(e=> {

            if (lastEntry !== null) {
                if (e.indentLevel === lastEntry.indentLevel) {
                    e.parent = lastEntry.parent;

                    if (e.parent !== null) {
                        e.parent.children.push(e);
                    }
                }
            }

            lastEntry = e;
        });

        var roots = entries.filter(e=> e.parent === null);

        var writeChildrenDebug = (e: IDslDefinitionEntry, indent: string) => {
            if (e === null) { return; }
            return e.children.map(c=> indent + c._debug + "\r\n" + writeChildrenDebug(c, indent + "\t")).join("");
        };



        var d = roots.map(e=> e._debug + "\r\n" + writeChildrenDebug(e, "\t")).join("\r\n");

        return {
            _debug: d,
            replacements: replacements,
            entries: entries,
            roots: roots
        };
    }
}