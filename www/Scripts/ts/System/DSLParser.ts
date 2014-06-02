﻿/// <reference path="Told.Utils.ts" />
/// <reference path="DSLDefinitionParser.ts" />

module Told.DSL {

    export interface IDsl {
        documentTextRaw: string;
        documentTextNormalized: string;

        root: IDslNode;
    }

    export interface IDslNode {
        _preText?: string;
        rawText: string;

        //Type is the definition name that matches
        type: string;

        // Children are sub definition matches
        _childrenText?: string;
        _childrenDefs?: IDslDefinitionEntry[];
        _childrenVariableAdjustement?: number;

        childrenNodes: IDslNode[];

        // Values are dynamically created
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

        // Use the definition to parse the document
        var splitAndProcessParts = (textPart: string, defSiblings: IDslDefinitionEntry[], variableBase: number): IDslNode[]=> {

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
                    type: s.name,
                    regex: regex,
                    variableAdjustment: variableAdjustement,
                    isOpenEnded: defSource.isOpenEnded,
                    valueNames: defSource.targets,
                    children: defSource.children,
                };
            });

            // Create the split regex
            // TODO: Handle the "..." catch all
            // If a catch all is first, it will catch the pretext
            // If a catch all is last, it will only catch left over posttext
            // If there are still left over posttext, the first catch all will get it
            var captureAllDefs = defTypes.filter(d=> d.regex === "" && d.isOpenEnded);
            var matchingDefs = defTypes.filter(d=> d.regex !== "" || !d.isOpenEnded);

            var r = "("
                + matchingDefs.map(p=> p.regex).join("|")
                + ")";

            // This will split like:
            // parts=           PRETEXT,     MIDTEXT,    MIDTEXT,    POSTTEXT
            // exactMatches=    M1,          M2,         M3

            // replace trick to find exact matches
            var parts: { text: string; wasUsed?: boolean; }[] = [];
            var exactMatches: string[] = [];
            var lastOffset = 0;

            textPart.replace(new RegExp(r, "g"), function () {

                var m = <string> arguments[0];
                var offset = <number> arguments[arguments.length - 2];

                parts.push({ text: textPart.substr(lastOffset, offset - lastOffset) });
                exactMatches.push(m);

                lastOffset = offset + m.length;

                return m;
            });

            parts.push({ text: textPart.substr(lastOffset) });

            var nodes: IDslNode[] = [];

            // Find the specific def that was matched for each part


            var addCaptureAllNode = (part: { text: string; wasUsed?: boolean; }, isFirst: boolean) => {
                // Any parts not used will be matched to capture all:
                // First leftover will match first capture all
                // Other leftovers will match last capture all
                if (part.wasUsed || captureAllDefs.length === 0) {
                    return;
                }

                var caDef = isFirst ? captureAllDefs[0] : captureAllDefs[captureAllDefs.length - 1];

                nodes.push({
                    rawText: part.text,

                    type: caDef.type,
                    valueNames: [],
                    values: [],

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

                var mType = matchingDefs.filter(t=> matchText.match(t.regex) !== null)[0];

                if (mType.isOpenEnded) {
                    postPart.wasUsed = true;
                } else {
                    postText = "";
                }

                var mValues = matchText.match(mType.regex);
                // Skip the whole match
                mValues.shift();

                var valueNames = mType.valueNames;
                var values = {};
                var subText = postText;

                for (var iValue = 0; iValue < mValues.length; iValue++) {

                    var vName = valueNames[iValue];
                    if (vName !== "...") {
                        values[vName] = mValues[iValue];
                    } else {
                        subText = mValues[iValue];
                    }
                }

                addCaptureAllNode(prePart, iMatch === 0);

                nodes.push({
                    rawText: matchText + postText,

                    type: mType.type,
                    valueNames: valueNames,
                    values: values,
                    _childrenText: subText,
                    _childrenDefs: mType.children,
                    _childrenVariableAdjustement: mType.variableAdjustment,
                    childrenNodes: null
                });

                addCaptureAllNode(postPart, false);

                //throw "breakdance";
            }

            // Go deeper
            nodes.forEach(n=> {
                var breakdance = true;
                //throw "breakdance";
                //if (n.type === "part") {
                n.childrenNodes = splitAndProcessParts(n._childrenText, n._childrenDefs, n._childrenVariableAdjustement)
                  //  }
            });

            throw "breakdance";

            return nodes;
        };

        // Start with "ROOT" (ignore its pattern)
        var rootDef = dd.roots.filter(r=> r.name === "ROOT")[0];
        var rootNodes = splitAndProcessParts(text, rootDef.children, 0);
        var rootNode: IDslNode = {
            rawText: text,
            type: "ROOT",

            _childrenText: text,
            _childrenDefs: rootDef.children,
            _childrenVariableAdjustement: 0,
            childrenNodes: rootNodes,

            valueNames: [],
            values: {},
        }

        // Automatic breakpoint
        throw "breakdance";

        return {
            documentTextRaw: textRaw,
            documentTextNormalized: textNormalized,

            root: rootNode,
        };
    }
}