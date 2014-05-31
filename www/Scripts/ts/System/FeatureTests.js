/// <reference path="../../typings/jquery/jquery.d.ts" />
/// <reference path="../../typings/qunit/qunit.d.ts" />
/// <reference path="Told.Utils.ts" />
var Told;
(function (Told) {
    (function (FeatureTests) {
        // DEBUG
        var _start = start;
        start = function () {
            console.log("start");
            _start();
        };
        var _stop = stop;
        stop = function () {
            console.log("start");
            _stop();
        };

        FeatureTests.TimeOutStep = 3000;

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
                this._featureDefinition = { title: title, notes: summaryStatements, scenarios: [] };
                Feature.TestedFeatures.push(this._featureDefinition);

                QUnit.module(title);
                test("Summary", function () {
                    for (var i = 0; i < summaryStatements.length; i++) {
                        testLog(summaryStatements[i]);
                    }
                });
            }
            Feature.prototype.scenario = function (title, expectedSteps, execute, timeoutOverride) {
                if (typeof timeoutOverride === "undefined") { timeoutOverride = null; }
                this._featureDefinition.scenarios.push({ title: title, steps: expectedSteps, time: null });

                var steps = [];
                var stepSummary = "Scenario: " + title + "\r\n";

                for (var i = 0; i < expectedSteps.length; i++) {
                    stepSummary += "\t" + expectedSteps[i] + "\r\n";
                }

                var timeoutID = null;

                var resetTimeout = function () {
                    var t = timeoutOverride || FeatureTests.TimeOutStep;

                    if (timeoutID !== null) {
                        clearTimeout(timeoutID);
                        console.log("Cleared " + timeoutID);
                        timeoutID = null;
                    }

                    timeoutID = setTimeout(function () {
                        ok(false, "Test Timed Out after " + t + "ms");

                        done();
                    }, t);

                    console.log("Started " + timeoutID);
                };

                var step = function (title) {
                    resetTimeout();

                    testLog("\tSTEP: " + title);
                    steps.push(title);
                };

                var done = function () {
                    clearTimeout(timeoutID);
                    console.log("Cleared " + timeoutID);
                    timeoutID = null;

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
                        resetTimeout();
                        execute(step, done, fail);
                    } catch (error) {
                        ok(false, "Exception: " + error);
                        done();
                    }
                });
            };
            Feature.TestedFeatures = [];
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

                QUnit.module("Features List");
                asyncTest("Load Feature Definitions", function () {
                    var timeoutID;

                    var resetTimeout = function () {
                        clearTimeout(timeoutID);
                        timeoutID = setTimeout(function () {
                            start();
                        }, FeatureTests.TimeOutStep);
                    };

                    resetTimeout();

                    var features = [];

                    var onFeatureFilesFinishedLoading = function () {
                        clearTimeout(timeoutID);

                        // End the Load Feature Definitions test
                        ok(true, "Features Loaded");
                        start();

                        // Compare the feature definitions to the actual feature tests
                        var tested = [];
                        var doComparison = function (a, b, aType, bType) {
                            a.forEach(function (f) {
                                //if (tested.some(item=> item.title === f.title)) {
                                //    return;
                                //}
                                //tested.push(f);
                                test(aType + " - " + f.title, function () {
                                    var mFeatures = b.filter(function (item) {
                                        return item.title === f.title;
                                    });
                                    if (mFeatures.length === 0) {
                                        ok(false, "Feature " + bType + " Missing: " + f.title);
                                    } else if (mFeatures.length > 1) {
                                        ok(false, "Feature Has Too Many " + bType + "s: " + f.title);
                                    } else {
                                        var f2 = mFeatures[0];
                                        f.scenarios.forEach(function (s) {
                                            var mScenarios = f2.scenarios.filter(function (item) {
                                                return item.title === s.title;
                                            });
                                            if (mScenarios.length === 0) {
                                                ok(false, "Scenario " + bType + " Missing: " + s.title);
                                            } else if (mScenarios.length > 1) {
                                                ok(false, "Scenario Has Too Many " + bType + "s: " + s.title);
                                            } else {
                                                ok(true, "Scenario has a " + bType + ": " + s.title);
                                            }
                                        });
                                    }
                                });
                            });
                        };

                        doComparison(features, Feature.TestedFeatures, "FILE", "TEST");
                        doComparison(Feature.TestedFeatures, features, "TEST", "FILE");
                    };

                    var onFeatureFileLoaded = function (fileUrl, fileText) {
                        resetTimeout();

                        var f = FeatureFiles.parseFeatureFile(fileText);
                        features.push(f);
                    };

                    var onFeatureFileLoadError = function (fileUrl, errorMessage) {
                        resetTimeout();

                        ok(false, "Load FeatureFile Error: " + fileUrl + " : " + errorMessage);
                        start();
                        //throw "FeatureFile was not loaded: " + fileUrl + " : " + errorMessage;
                    };

                    var onFileListLoaded = function (data) {
                        resetTimeout();

                        var files = FeatureFiles.parseLines(data);
                        var urls = files.map(function (f) {
                            return featureFolderUrl + "/" + f;
                        });

                        Told.Utils.loadAllTextFiles(urls, onFeatureFileLoaded, onFeatureFileLoadError, onFeatureFilesFinishedLoading);
                    };

                    FeatureFiles.loadFeatureList(featureListUrl, onFileListLoaded);
                });
            };

            FeatureFiles.parseLines = function (text) {
                return text.split("\n").map(function (f) {
                    return f.trim();
                }).filter(function (f) {
                    return f.length > 0;
                });
            };

            FeatureFiles.parseFeatureFile = function (text) {
                var parts = text.split("Scenario:");
                var fParts = FeatureFiles.parseLines(parts[0]);

                var feature = {
                    title: fParts[0].split("Feature:").join("").trim(),
                    notes: fParts.slice(1),
                    scenarios: parts.slice(1).map(function (p) {
                        var sParts = FeatureFiles.parseLines(p);

                        var stParts = sParts[0].split("(");

                        return {
                            title: stParts[0].trim(),
                            time: parseInt((stParts[1] || "").split(")").join().trim()),
                            steps: sParts.slice(1)
                        };
                    })
                };

                return feature;
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
            return FeatureFiles;
        })();
        FeatureTests.FeatureFiles = FeatureFiles;
    })(Told.FeatureTests || (Told.FeatureTests = {}));
    var FeatureTests = Told.FeatureTests;
})(Told || (Told = {}));
