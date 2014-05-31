/// <reference path="Told.Utils.ts" />

module Told.DSL {

    export interface IDslDefinition {

    }

    export function loadDslDefinition(documentUrl: string, onLoaded: (definition: IDslDefinition) => void, onError: (message: string) => void) {
        var url = documentUrl;

        Told.Utils.loadTextFile(documentUrl, text=> { return parseDslDefinition(text); }, onError);
    }

    export function parseDslDefinition(documentText: string): IDslDefinition {
        throw "Not Implemented";
    }
}