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

        type: string;

        valueNames: string[];
        values: IDslValues;

        children: IDslNode[];
    }

    export interface IDslValues {
        [valueName: string]: IDslValue;
    }

    export interface IDslValue {
        capture: Told.Utils.ICapture;
        value: string;
    }

    export interface IDslNodeInner extends IDslNode {

        _matchedText: string;

        _indexInDocument: number;
        _textRange: ITextRange;

        _definition: IResolvedDefinition;

        _childrenSubTextRange: ITextRange;
        _childrenSubText: string;
    }

    export interface IResolvedDefinition {
        definition: IDslDefinitionEntry;
        type: string;
        regexStr: string;
        regex: RegExp;
        variableAdjustment: number;
        isOpenEnded: boolean;
        valueNames: string[];
        children: IDslDefinitionEntry[];
    }

    interface IResolvedDefinitionInfo {
        defType: IResolvedDefinition;
        isCatchAll: boolean;
        isOpenEnded: boolean;
        preCatchAll: IResolvedDefinition;
        postCatchAll: IResolvedDefinition;
    }

    export interface ITextRange {
        index: number;
        length: number;
        matchInfo: Told.Utils.IMatchInfo;
        defType: IResolvedDefinition;
    }

    interface ITextRangeInner extends ITextRange {
        isCatchAll: boolean;
        wasHandled: boolean;
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
            type: "ROOT",

            value: "",
            valueNames: [],
            values: {},

            children: rootNodes,
        };

        // Debug All
        rootNode._debugAll = "ROOT"
        + "\r\n\t"
        + rootNode.children.map(c=> Told.Utils.replaceAll(c._debugAll, "\r\n", "\r\n\t")).join("\r\n\t");

        rootNode._debugAll = rootNode._debugAll.trim();

        return {
            documentTextRaw: textRaw,
            documentTextNormalized: textNormalized,

            root: rootNode,
        };
    }

    export function splitAndProcessParts(dslDefinition: IDslDefinition, textPart: string, textIndexInDocument: number, defSiblings: IDslDefinitionEntry[], variableBase: number): IDslNode[] {

        if (textPart === "" || textPart === null) { return []; }

        var resolvedDefinitionInfos = resolveDefinitions(dslDefinition, defSiblings, variableBase);
        var acceptedMatches = findMatches(textPart, resolvedDefinitionInfos);
        var textRanges = findTextRanges(textPart, acceptedMatches, resolvedDefinitionInfos);
        var nodes = processTextRanges(textRanges, textPart, textIndexInDocument);

        // Go deeper
        nodes.forEach(n=> {

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
                    n.children = splitAndProcessParts(
                        dslDefinition,
                        n._childrenSubText,
                        n._childrenSubTextRange.index + textIndexInDocument,
                        n._definition.children,
                        n._definition.variableAdjustment);
                }
            }
        });

        // Debug
        nodes.forEach(n=> {

            var debug =
                n.type + ":"
                + n.valueNames.map(v=> {
                    var val = n.values[v] !== undefined ? n.values[v].value : "";
                    return " " + v + "='" + val + "'";
                }).join(",")
            ;

            n._debug = debug;
            n._debugAll = debug;
        });

        // Debug All
        nodes.forEach(n=> {
            n._debugAll = n._debugAll
            + "\r\n\t"
            + n.children.map(c=> Told.Utils.replaceAll(c._debugAll, "\r\n", "\r\n\t")).join("\r\n\t");

            n._debugAll = n._debugAll.trim();
        });

        return nodes;
    }

    function resolveDefinitions(dslDefinition: IDslDefinition, defSiblings: IDslDefinitionEntry[], variableBase: number): IResolvedDefinitionInfo[] {

        // Get the sibling patterns
        var defTypes: IResolvedDefinition[] = defSiblings.map(s=> {

            // Get the copy if it is defined
            var defSource: IDslDefinitionEntry;
            var variableAdjustement: number = 0;

            if (s.copyPatternName !== "") {
                var mCopies = dslDefinition.roots.filter(r=> r.name === s.copyPatternName);

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
        var defTypesWithCatchAll: IResolvedDefinitionInfo[] = defTypes.map(d=> {
            return {
                defType: d,
                isCatchAll: d.regexStr === "",
                isOpenEnded: d.isOpenEnded,
                preCatchAll: d,
                postCatchAll: d,
            };
        });

        var unknownCatchAll: IResolvedDefinition = {
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
                    if (defTypesWithCatchAll[iDefTypes].isCatchAll) {
                        cBefore = defTypesWithCatchAll[iDefTypes];
                    }
                }

                for (var iDefTypes = i; iDefTypes < defTypesWithCatchAll.length; iDefTypes++) {
                    if (defTypesWithCatchAll[iDefTypes].isCatchAll) {
                        cAfter = defTypesWithCatchAll[iDefTypes];
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

        return defTypesWithCatchAll;
    }

    interface IDefinitionMatch {
        resolvedDefInfo: IResolvedDefinitionInfo;
        matchInfo: Told.Utils.IMatchInfo;
    }

    function findMatches(text: string, resolvedDefInfos: IResolvedDefinitionInfo[]): IDefinitionMatch[] {
        // Find all next match
        var searchIndex = 0;

        var getMatchWithIndex = (r: RegExp) => {
            return Told.Utils.matchWithIndex(text, searchIndex, r);
        };

        // create blank of unknown type
        var acceptedMatches: IDefinitionMatch[] = [];

        while (searchIndex < text.length) {
            var nextMatches: IDefinitionMatch[] = resolvedDefInfos
                .filter(d=> !d.isCatchAll)
                .map(d=> { return { resolvedDefInfo: d, matchInfo: getMatchWithIndex(d.defType.regex) } });

            var nMatch: IDefinitionMatch = null;

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

        return acceptedMatches;
    }



    function findTextRanges(text: string, acceptedMatches: IDefinitionMatch[], resolvedDefinitionInfos: IResolvedDefinitionInfo[]): ITextRangeInner[] {

        // Process the leftover text with the catch alls
        var textRanges: ITextRangeInner[] = [];
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
                wasHandled: false,
            });
        } else {

            var iNext = 0;

            am.forEach((a, i) => {

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
                        wasHandled: false,
                    });

                    iNext = am[0].matchInfo.index;
                }

                // Match text
                var tr: ITextRangeInner = {
                    index: a.matchInfo.index,
                    length: a.matchInfo.length,
                    isCatchAll: false,
                    matchInfo: a.matchInfo,
                    defType: a.resolvedDefInfo.defType,
                    wasHandled: false,
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
                        wasHandled: false,
                    });

                    iNext = tPostIndex + tPostLength;
                }
            });
        }

        return textRanges;
    }

    function processTextRanges(textRanges: ITextRangeInner[], text: string, textIndexInDocument: number): IDslNodeInner[] {
        // Process the text ranges with their definitions
        var nodes: IDslNodeInner[] = [];

        textRanges.forEach((t, ti) => {

            if (t.wasHandled) { return; }

            var result: IDslNodeInner = {

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
                _childrenSubText: "",

            };

            if (!t.isCatchAll) {

                var valueNames = t.defType.valueNames;
                var values: IDslValues = {};
                var cValues = t.matchInfo.captures;
                var subCapture: Told.Utils.ICapture = null;

                for (var iValue = 0; iValue < cValues.length; iValue++) {

                    var vName = valueNames[iValue];

                    if (vName === "...") {
                        subCapture = cValues[iValue];
                    } else {
                        values[vName] = { capture: cValues[iValue], value: cValues[iValue].matchText };
                    }
                }

                // Remove ...
                valueNames = valueNames.filter(v=> v !== "..." && v !== ".");

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
                        defType: null,
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
                        defType: null,
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
                    defType: null,
                };

            }

            nodes.push(result);
            t.wasHandled = true;
        });

        return nodes;
    }


}