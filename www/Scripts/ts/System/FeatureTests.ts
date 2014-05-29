/// <reference path="../../typings/qunit/qunit.d.ts" />

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

}