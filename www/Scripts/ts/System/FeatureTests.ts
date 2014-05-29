﻿/// <reference path="../../typings/qunit/qunit.d.ts" />

module Told.FeatureTests {

    export var TestTimeOut = 5000;

    function testLog(message: string) {
        ok(true, message);
    }

    export function createStepProcess<T>(execute: (step: (title: string) => void, done: () => void, fail: (message?: string) => void, data: T) => void):
        (step: (title: string) => void, done: () => void, fail: (message?: string) => void, data: T, next: () => void) => void {

        return (step, done, fail, data, next) => {
            // Don't use done, call next instead
            execute(step, next, fail, data);
        };
    }

    export class Feature {
        constructor(title: string, summaryStatements: string[]) {
            QUnit.module(title);
            test("Summary", () => {

                for (var i = 0; i < summaryStatements.length; i++) {
                    testLog(summaryStatements[i]);
                }
            });
        }

        public createStepProcess = createStepProcess;

        public scenario(title: string, expectedSteps: string[], execute: (step: (title: string) => void, done: () => void, fail: (message?: string) => void) => void, timeoutOverride: number = null) {

            var steps: string[] = [];
            var stepSummary = "Scenario: " + title + "\r\n";

            for (var i = 0; i < expectedSteps.length; i++) {
                stepSummary += "\t" + expectedSteps[i] + "\r\n";
            }


            var timeoutID: number = null;

            var resetTimeout = function () {
                clearTimeout(timeoutID);

                var t = timeoutOverride || TestTimeOut;

                timeoutID = setTimeout(() => {
                    ok(false, "Test Timed Out after " + t + "ms");

                    done();
                }, t);
            };

            var step = function (title: string) {
                resetTimeout();

                testLog("\tSTEP: " + title);
                steps.push(title);
            }

            var done = function () {
                clearTimeout(timeoutID);

                deepEqual(steps, expectedSteps, "Actual steps match the expected steps");
                start();
            };

            var fail = function (message: string= "") {
                ok(false, "FAIL: " + message);
                done();
            }

            asyncTest(title, () => {
                testLog(stepSummary);

                try {
                    execute(step, done, fail);
                    resetTimeout();

                } catch (error) {
                    ok(false, "Exception: " + error);
                    done();
                }
            });
        }
    }

    export interface IFeatureDefinition {
        title: string;
        scenarios: IScenarioDefinition[];
    }

    export interface IScenarioDefinition {
        title: string;
        steps: string[];
    }

    export class FeatureFiles {
        public static verifyFeatures(featureListUrl: string, featureFolderUrl: string) {

            if (featureFolderUrl[featureFolderUrl.length - 1] === "/") {
                featureFolderUrl = featureFolderUrl.substr(0, featureFolderUrl.length - 1);
            }

            //QUnit.module("Features List");
            //asyncTest("Verify Features", () => {});


            var features: IFeatureDefinition[] = [];

            var onFeatureFilesFinishedLoading = () => {
                // TODO: Compare the feature definitions to the actual feature tests
                throw "Not Implemented";
            };

            var onFeatureFileLoaded = (fileUrl: string, fileText: string) => {
                var f = FeatureFiles.parseFeatureFile(fileText);
                features.push(f);
            };

            var onFeatureFileLoadError = (fileUrl: string, errorMessage: string) => {
                //ok(false, "Load FeatureFile Error: " + fileUrl + " : " + errorMessage);
                //start();
                throw "FeatureFile was not loaded: " + fileUrl + " : " + errorMessage;
            };

            var onFileListLoaded = (data: string) => {
                var files = FeatureFiles.parseFeatureList(data);
                var urls = files.map(f=> featureFolderUrl + "/" + f);

                FeatureFiles.loadAllTextFiles(urls, onFeatureFileLoaded, onFeatureFileLoadError, onFeatureFilesFinishedLoading);
            };

            FeatureFiles.loadFeatureList(featureListUrl, onFileListLoaded);
        }

        static parseFeatureList(text: string): string[] {
            return text.split("\n").map(f=> f.trim()).filter(f=> f.length > 0);
        }

        static parseFeatureFile(text: string): IFeatureDefinition {
            throw "Not Implemented";
        }

        static loadFeatureList(featureListUrl: string, onFileListLoaded: (data: string) => void) {
            // Load file list with ajax
            var url = featureListUrl;

            var onError = (message: string) => {
                ok(false, "Load FeatureList Error: " + message);
            };

            $.ajax(url,
                {
                    dataType: "text",
                    cache: true,
                    success: (data: string) => { onFileListLoaded(data); },
                    error: (jqXHR: JQueryXHR, textStatus: string, errorThrow: string) => { if (onError) { onError(textStatus + ": " + errorThrow); } }
                });
        }

        static loadAllTextFiles(fileUrls: string[],
            onFileLoaded: (fileUrl: string, data: string) => void,
            onFileError: (fileUrl: string, errorMessage: string) => void,
            onAllFilesFinishedLoading: () => void) {

            var loadCount = 0;

            var markFileAsLoaded = () => {
                loadCount++;

                if (loadCount === fileUrls.length) {
                    onAllFilesFinishedLoading();
                }
            };

            var onLoaded = (fileUrl: string, data: string) => {
                onFileLoaded(fileUrl, data);
                markFileAsLoaded();
            };

            var onError = (fileUrl: string, message: string) => {
                ok(false, "Load Text File Error: " + message);
                onFileError(fileUrl, message);
                markFileAsLoaded();
            };

            fileUrls.forEach((url) => {
                $.ajax(url,
                    {
                        dataType: "text",
                        cache: true,
                        success: (data: string) => { onLoaded(url, data); },
                        error: (jqXHR: JQueryXHR, textStatus: string, errorThrow: string) => { if (onError) { onError(url, textStatus + ": " + errorThrow); } }
                    });
            });

        }
    }
}