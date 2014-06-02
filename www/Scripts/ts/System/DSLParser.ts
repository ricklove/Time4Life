/// <reference path="Told.Utils.ts" />
/// <reference path="DSLDefinitionParser.ts" />

module Told.DSL {

    export interface IDsl {
        documentTextRaw: string;
        documentTextNormalized: string;

        root: IDslNode;
    }

    export interface IDslNode {
        rawText: string;
        children: IDslNode[];

        // Variables will be dynamically created
        variableNames: string[];
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
        var splitAndProcessParts = (textPart: string, defSiblings: IDslDefinitionEntry[]): IDslNode[]=> {
            // Create regex from siblings
            var r = "";

            defSiblings.forEach(s=> {

                // Get the copy if it is defined
                var regexSource: IDslDefinitionEntry;

                if (s.copyPatternName !== "") {
                    var mCopies = dd.roots.filter(r=> r.name === s.copyPatternName);

                    if (mCopies.length > 1) {
                        throw "Definition has multiple root entities called '" + s.copyPatternName + "'";
                    } else if (mCopies.length < 1) {
                        throw "Definition has no root entities called '" + s.copyPatternName + "'";
                    }

                    regexSource = mCopies[0];
                } else {
                    regexSource = s;
                }

                // Do variable replacements
                throw "Not Implemented";
            });

            // This will split like:
            // PRETEXT, M1, MIDTEXT, M2, MIDTEXT, M3, POSTTEXT
            var parts = textPart.split(new RegExp(r));

            throw "Not Implemented";
        };

        // Start with "ROOT" (ignore its pattern)
        var rootDef = dd.roots.filter(r=> r.name === "ROOT")[0];
        var rootNodes = splitAndProcessParts(text, rootDef.children);
        var rootNode: IDslNode = {
            rawText: text,
            children: rootNodes,
            variableNames: [],
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