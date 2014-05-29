/// <reference path="../../typings/qunit/qunit.d.ts" />
var Told;
(function (Told) {
    (function (FeatureTests) {
        FeatureTests.TestTimeOut = 5000;

        function testLog(message) {
            ok(true, message);
        }

        function createStepProcess(execute) {
            return function (step, done, fail, data, next) {
                // Don't use done, call next instead
                execute(step, next, fail, data);
            };
        }
        FeatureTests.createStepProcess = createStepProcess;

        var Feature = (function () {
            function Feature(title, summaryStatements) {
                this.createStepProcess = createStepProcess;
                QUnit.module(title);
                test("Summary", function () {
                    for (var i = 0; i < summaryStatements.length; i++) {
                        testLog(summaryStatements[i]);
                    }
                });
            }
            Feature.prototype.scenario = function (title, expectedSteps, execute, timeoutOverride) {
                if (typeof timeoutOverride === "undefined") { timeoutOverride = null; }
                var steps = [];
                var stepSummary = "Scenario: " + title + "\r\n";

                for (var i = 0; i < expectedSteps.length; i++) {
                    stepSummary += "\t" + expectedSteps[i] + "\r\n";
                }

                var timeoutID = null;

                var resetTimeout = function () {
                    clearTimeout(timeoutID);

                    var t = timeoutOverride || FeatureTests.TestTimeOut;

                    timeoutID = setTimeout(function () {
                        ok(false, "Test Timed Out after " + t + "ms");

                        done();
                    }, t);
                };

                var step = function (title) {
                    resetTimeout();

                    testLog("\tSTEP: " + title);
                    steps.push(title);
                };

                var done = function () {
                    clearTimeout(timeoutID);

                    deepEqual(steps, expectedSteps, "Actual steps match the expected steps");
                    start();
                };

                var fail = function (message) {
                    if (typeof message === "undefined") { message = ""; }
                    ok(false, "FAIL: " + message);
                    done();
                };

                asyncTest(title, function () {
                    testLog(stepSummary);

                    try  {
                        execute(step, done, fail);
                        resetTimeout();
                    } catch (error) {
                        ok(false, "Exception: " + error);
                        done();
                    }
                });
            };
            return Feature;
        })();
        FeatureTests.Feature = Feature;

        var FeatureFiles = (function () {
            function FeatureFiles() {
            }
            FeatureFiles.verifyFeatures = function (featureListUrl, featureFolderUrl) {
                if (featureFolderUrl[featureFolderUrl.length - 1] === "/") {
                    featureFolderUrl = featureFolderUrl.substr(0, featureFolderUrl.length - 1);
                }

                //QUnit.module("Features List");
                //asyncTest("Verify Features", () => {});
                var features = [];

                var onFeatureFilesFinishedLoading = function () {
                    throw "Not Implemented";
                };

                var onFeatureFileLoaded = function (fileUrl, fileText) {
                    var f = FeatureFiles.parseFeatureFile(fileText);
                    features.push(f);
                };

                var onFeatureFileLoadError = function (fileUrl, errorMessage) {
                    throw "FeatureFile was not loaded: " + fileUrl + " : " + errorMessage;
                };

                var onFileListLoaded = function (data) {
                    var files = FeatureFiles.parseFeatureList(data);
                    var urls = files.map(function (f) {
                        return featureFolderUrl + "/" + f;
                    });

                    FeatureFiles.loadAllTextFiles(urls, onFeatureFileLoaded, onFeatureFileLoadError, onFeatureFilesFinishedLoading);
                };

                FeatureFiles.loadFeatureList(featureListUrl, onFileListLoaded);
            };

            FeatureFiles.parseFeatureList = function (text) {
                return text.split("\n").map(function (f) {
                    return f.trim();
                }).filter(function (f) {
                    return f.length > 0;
                });
            };

            FeatureFiles.parseFeatureFile = function (text) {
                throw "Not Implemented";
            };

            FeatureFiles.loadFeatureList = function (featureListUrl, onFileListLoaded) {
                // Load file list with ajax
                var url = featureListUrl;

                var onError = function (message) {
                    ok(false, "Load FeatureList Error: " + message);
                };

                $.ajax(url, {
                    dataType: "text",
                    cache: true,
                    success: function (data) {
                        onFileListLoaded(data);
                    },
                    error: function (jqXHR, textStatus, errorThrow) {
                        if (onError) {
                            onError(textStatus + ": " + errorThrow);
                        }
                    }
                });
            };

            FeatureFiles.loadAllTextFiles = function (fileUrls, onFileLoaded, onFileError, onAllFilesFinishedLoading) {
                var loadCount = 0;

                var markFileAsLoaded = function () {
                    loadCount++;

                    if (loadCount === fileUrls.length) {
                        onAllFilesFinishedLoading();
                    }
                };

                var onLoaded = function (fileUrl, data) {
                    onFileLoaded(fileUrl, data);
                    markFileAsLoaded();
                };

                var onError = function (fileUrl, message) {
                    ok(false, "Load Text File Error: " + message);
                    onFileError(fileUrl, message);
                    markFileAsLoaded();
                };

                fileUrls.forEach(function (url) {
                    $.ajax(url, {
                        dataType: "text",
                        cache: true,
                        success: function (data) {
                            onLoaded(url, data);
                        },
                        error: function (jqXHR, textStatus, errorThrow) {
                            if (onError) {
                                onError(url, textStatus + ": " + errorThrow);
                            }
                        }
                    });
                });
            };
            return FeatureFiles;
        })();
        FeatureTests.FeatureFiles = FeatureFiles;
    })(Told.FeatureTests || (Told.FeatureTests = {}));
    var FeatureTests = Told.FeatureTests;
})(Told || (Told = {}));
