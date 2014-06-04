/// <reference path="Told.Utils.ts" />
/// <reference path="DSLDefinitionParser.ts" />

module Told.DSL {

    export interface IDsl {
        documentTextRaw: string;
        documentTextNormalized: string;

        root: IDslNode;
    }

    export interface IDslNode {
        _debug?: string;
        _debugAll?: string;
        _preText?: string;
        rawText: string;
        index: number;

        //Type is the definition name that matches
        type: string;

        // Children are sub definition matches
        _childrenText?: string;
        _childrenTextIndex?: number;
        _childrenDefs?: IDslDefinitionEntry[];
        _childrenVariableAdjustement?: number;

        childrenNodes: IDslNode[];

        // Values are dynamically created
        value: string; // {{.}}
        valueNames: string[];
        values: any;
    }

    export function loadDsl(documentUrl: string, dslDefinition: IDslDefinition, onLoaded: (dsl: IDsl) => void, onError: (message: string) => void) {
        var url = documentUrl;

        Told.Utils.loadTextFile(documentUrl, text=> {
            var dsl = parseDsl(text, dslDefinition);
            onLoaded(dsl);
        }, onError);
    }

    export function parseDsl(documentText: string, dslDefinition: IDslDefinition): IDsl {

        var dd = dslDefinition;
        var textRaw = documentText;

        // Normalize document
        var text = documentText;

        // Add blank lines at borders
        text = "\r\n" + text + "\r\n";

        text = text
        // Normalize end of lines
            .replace(/\r?\n/g, "\r\n")
        // Strip out comments (ignore indent)
            .replace(/\r\n\s*\/\/[^\r]*/g, "")
        // Remove multiple blank lines (only one is needed)
        // And remove space from blank lines
            .replace(/\r\n(\s*\r\n)+/g, "\r\n\r\n")
        ;

        var textNormalized = text;



        // Start with "ROOT" (ignore its pattern)
        var rootDef = dd.roots.filter(r=> r.name === "ROOT")[0];
        var rootNodes = splitAndProcessParts(dd, text, 0, rootDef.children, 0);
        var rootNode: IDslNode = {
            rawText: text,
            index: 0,
            type: "ROOT",

            _childrenText: text,
            _childrenDefs: rootDef.children,
            _childrenVariableAdjustement: 0,
            childrenNodes: rootNodes,

            value: "",
            valueNames: [],
            values: {},
        }

        // Debug All
        rootNode._debugAll = "ROOT"
        + "\r\n\t"
        + rootNode.childrenNodes.map(c=> Told.Utils.replaceAll(c._debugAll, "\r\n", "\r\n\t")).join("\r\n\t");

        rootNode._debugAll = rootNode._debugAll.trim();


        // Automatic breakpoint
        //throw "breakdance";

        return {
            documentTextRaw: textRaw,
            documentTextNormalized: textNormalized,

            root: rootNode,
        };
    }

    // Use the definition to parse the document
    export function splitAndProcessParts(dslDefinition: IDslDefinition, textPart: string, textIndex: number, defSiblings: IDslDefinitionEntry[], variableBase: number): IDslNode[] {

        var dd = dslDefinition;

        if (textPart === "") { return []; }

        // Get the sibling patterns
        var defTypes = defSiblings.map(s=> {

            // Get the copy if it is defined
            var defSource: IDslDefinitionEntry;
            var variableAdjustement: number = 0;

            if (s.copyPatternName !== "") {
                var mCopies = dd.roots.filter(r=> r.name === s.copyPatternName);

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
            defSource.regexVariables.forEach(v=>
                regex = Told.Utils.replaceAll(regex, v.text, "" + (v.defaultValue + variableBase + variableAdjustement)));

            return {
                definition: s,
                type: s.name,
                regexStr: regex,
                regex: new RegExp(regex, "g"),
                variableAdjustment: variableAdjustement,
                isOpenEnded: defSource.isOpenEnded,
                valueNames: defSource.targets,
                children: defSource.children,
            };
        });

        // Get post and pre catch alls
        var defTypesWithCatchAll = defTypes.map(d=> {
            return {
                defType: d,
                isCatchAll: d.regexStr === "",
                isOpenEnded: d.isOpenEnded,
                preCatchAll: d,
                postCatchAll: d,
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
            children: [],
        };

        defTypesWithCatchAll.forEach((d, i) => {
            if (!d.isCatchAll) {

                var cBefore = Told.Utils.sameType(d, null);
                var cAfter = Told.Utils.sameType(d, null);

                for (var iDefTypes = i; iDefTypes >= 0; iDefTypes--) {
                    if (defTypesWithCatchAll[i].isCatchAll) {
                        cBefore = defTypesWithCatchAll[i];
                    }
                }

                for (var iDefTypes = i; iDefTypes < defTypesWithCatchAll.length; iDefTypes++) {
                    if (defTypesWithCatchAll[i].isCatchAll) {
                        cAfter = defTypesWithCatchAll[i];
                    }
                }

                d.preCatchAll =
                (cBefore !== null) ? cBefore.defType
                : (cAfter !== null) ? cAfter.defType
                : unknownCatchAll;

                d.postCatchAll =
                (d.isOpenEnded) ? d.defType
                : (cAfter !== null) ? cAfter.defType
                : (cBefore !== null) ? cBefore.defType
                : unknownCatchAll;
            }
        });


        // Find all next match
        var text = textPart;
        var searchIndex = 0;

        var getMatchWithIndex = (r: RegExp) => {
            r.lastIndex = searchIndex;
            var m = r.exec(text);

            if (m === null) { return null };

            var length = m[0].length;
            var index = r.lastIndex - length;
            r.lastIndex = 0;

            return { match: m, index: index, length: length };
        };

        // create blank of unknown type
        var acceptedMatches = Told.Utils.sameType([{
            defTypeWithCatchAll: defTypesWithCatchAll[0],
            matchInfo: getMatchWithIndex(defTypesWithCatchAll[0].defType.regex)
        }], []);

        while (searchIndex < text.length) {
            var nextMatches = defTypesWithCatchAll
                .filter(d=> !d.isCatchAll)
                .map(d=> { return { defTypeWithCatchAll: d, matchInfo: getMatchWithIndex(d.defType.regex) } });

            var nMatch = Told.Utils.sameType(nextMatches[0], null);

            nextMatches
                .filter(m=> m.matchInfo !== null)
                .forEach(m=> nMatch = (nMatch === null || nMatch.matchInfo.index > m.matchInfo.index) ? m : nMatch);

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

        // TODO: Process the leftover texts with the catch alls


        throw "Not Implemented";

        var nodes = null;

        // Go deeper
        nodes.forEach(n=> {

            if (n.type === "text") {
                var breakdance = true;
            }

            // Handle '...' with no children
            if (n._childrenDefs.length === 0) {
                n.value = n._childrenText;
                n.childrenNodes = [];
            } else {
                n.childrenNodes = splitAndProcessParts(dd, n._childrenText, n._childrenTextIndex, n._childrenDefs, n._childrenVariableAdjustement);
            }
        });

        // Debug
        nodes.forEach(n=> {
            var debug =
                n.type + ":"
                + (n.value !== "" ? (" '" + n.value + "'") : "")
                + n.valueNames.map(v=> " " + v + "='" + (n.values[v] || "") + "'").join(",")
            ;

            n._debug = debug;
            n._debugAll = debug;
        });

        // Debug All
        nodes.forEach(n=> {
            n._debugAll = n._debugAll
            + "\r\n\t"
            + n.childrenNodes.map(c=> Told.Utils.replaceAll(c._debugAll, "\r\n", "\r\n\t")).join("\r\n\t");

            n._debugAll = n._debugAll.trim();
        });

        //throw "breakdance";

        return nodes;
    }
}