/// <reference path="../../typings/qunit/qunit.d.ts" />
var Told;
(function (Told) {
    (function (FeatureTests) {
        FeatureTests.TestTimeOut = 5000;

        function testLog(message) {
            ok(true, message);
        }

        var Feature = (function () {
            function Feature(title, summaryStatements) {
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

                asyncTest(title, function () {
                    testLog(stepSummary);

                    try  {
                        execute(step, done);
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
    })(Told.FeatureTests || (Told.FeatureTests = {}));
    var FeatureTests = Told.FeatureTests;
})(Told || (Told = {}));
