/// <reference path="../../typings/jquery/jquery.d.ts" />

module Told.Utils {

    // ---------------------------------------
    // Typescript
    // ---------------------------------------
    export function sameType<T>(targetType: T, defaultValue: any): T {
        var t = targetType;
        t = defaultValue;
        return t;
    }

    // ---------------------------------------
    // Regex
    // ---------------------------------------
    export interface IMatchInfo extends ICapture {
        match: string[];
        captures: ICapture[];
    }

    export interface ICapture {
        matchText: string;
        index: number;
        length: number;

        match?: string[];
        captures?: ICapture[];
    }

    export function matchWithIndex(text: string, startIndex: number, r: RegExp): IMatchInfo {
        r.lastIndex = startIndex;
        var m = r.exec(text);

        if (m === null) { return null };

        var length = m[0].length;
        var index = r.lastIndex - length;
        r.lastIndex = 0;

        var match: string[] = [];
        m.forEach(mText=> match.push(mText));

        // Find capture indices
        var captures: ICapture[] = [];
        var nextIndex = 0;

        // Skip whole capture
        for (var i = 1; i < m.length; i++) {

            var mText = m[i];

            if (mText === undefined) {
                mText = "";
            }

            var c: ICapture = {
                matchText: mText,
                length: mText.length,
                index: mText !== "" ? m[0].indexOf(m[i], nextIndex) : -1,

                match: [m[i]],
                captures: []
            };

            // Don't increment index, because sub captures can be at the same place (but not behind)
            nextIndex = c.index;
            captures.push(c);
        }

        return { match: match, matchText: m[0], index: index, length: length, captures: captures };
    };


    export function expandSimpleRegex(simpleRegex: string): string {
        var expansions = [
            { simple: /`not'([^']*)'/g, actual: "(?:(?!$1).)" },
            { simple: /`word/g, actual: "\\w+" },
            { simple: / /g, actual: "\\s*" },
        ];

        var r = simpleRegex;

        expansions.forEach(x=> {
            r = r.replace(x.simple, x.actual);
        });

        return r;
    }

    export function replaceAll(text: string, find: string, replace: string) {
        return text.replace(new RegExp(escapeRegExp(find), 'g'), replace);
    }

    export function escapeRegExp(text: string) {
        return text.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    }

    // ---------------------------------------
    // File Loading 
    // ---------------------------------------
    export function loadAllTextFiles(fileUrls: string[],
        onFileLoaded: (fileUrl: string, data: string) => void,
        onFileError: (fileUrl: string, errorMessage: string) => void,
        onAllFilesFinishedLoading: () => void) {

        var loadCount = 0;

        var markFileAsLoaded = () => {
            loadCount++;

            if (loadCount === fileUrls.length) {
                // Don't let an exception block this from being called
                setTimeout(onAllFilesFinishedLoading, 0);
            }
        };



        fileUrls.forEach((url) => {

            var onLoaded = (data: string) => {
                markFileAsLoaded();
                onFileLoaded(url, data);
            };

            var onError = (message: string) => {
                markFileAsLoaded();
                onFileError(url, message);
            };

            loadTextFile(url, onLoaded, onError);

        });

    }

    export function loadTextFile(url: string, onLoaded: (data: string) => void, onError: (message: string) => void) {
        $.ajax(url,
            {
                dataType: "text",
                cache: true,
                success: (data: string) => { onLoaded(data); },
                error: (jqXHR: JQueryXHR, textStatus: string, errorThrow: string) => { if (onError) { onError(textStatus + ": " + errorThrow); } }
            });
    }
}