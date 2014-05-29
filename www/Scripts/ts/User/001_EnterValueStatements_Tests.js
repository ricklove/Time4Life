/// <reference path="../../typings/qunit/qunit.d.ts" />
/// <reference path="../System/FeatureTests.ts" />
/// <reference path="001_EnterValueStatements.ts" />
var Told;
(function (Told) {
    (function (Time4Life) {
        (function (UI) {
            (function (Tests) {
                var f = new Told.FeatureTests.Feature("001 - Enter Value Statements", [
                    "In order to feel Hope that I can Balance My Life                           ",
                    "So that I can overcome an Spending too Much Time on Unimportant Activities ",
                    "As a user                                                                  ",
                    "I can Type in My Value Statements                                          "
                ]);

                f.scenario("Should View the First Value Question", [
                    "Given this is the first run            ",
                    "When the app is loaded                 ",
                    "Then I can see the first value question"
                ], function (step, done) {
                    step("Given this is the first run");
                    var viewModel = new Told.Time4Life.UI.VMMain(Tests.providers_Empty);

                    Tests.step_WhenTheAppIsLoaded(viewModel, step, function () {
                        throw "Not Implemented";
                    }, done);
                });

                // Sample Data
                Tests.providers_Empty = {
                    userSettings: {},
                    config: {}
                };

                // Steps
                Tests.step_WhenTheAppIsLoaded = function (viewModel, step, onLoaded, onFail) {
                    step("When the app is loaded");

                    var onReady = function () {
                        onLoaded();
                    };

                    var onError = function (message) {
                        ok(false, "ERROR:" + message);
                        onFail();
                    };

                    viewModel.enterValueStatements.showDefault(onReady, onError);
                };
            })(UI.Tests || (UI.Tests = {}));
            var Tests = UI.Tests;
        })(Time4Life.UI || (Time4Life.UI = {}));
        var UI = Time4Life.UI;
    })(Told.Time4Life || (Told.Time4Life = {}));
    var Time4Life = Told.Time4Life;
})(Told || (Told = {}));
