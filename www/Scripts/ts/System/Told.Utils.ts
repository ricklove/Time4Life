/// <reference path="../../typings/jquery/jquery.d.ts" />

module Told.Utils {

    // ---------------------------------------
    // Regex
    // ---------------------------------------
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