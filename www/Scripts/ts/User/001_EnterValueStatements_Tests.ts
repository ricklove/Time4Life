/// <reference path="../../typings/qunit/qunit.d.ts" />
/// <reference path="../System/FeatureTests.ts" />
/// <reference path="001_EnterValueStatements.ts" />

module Told.Time4Life.UI.Tests {

    var f = new FeatureTests.Feature("001 - Enter Value Statements", [
        "In order to feel Hope that I can Balance My Life                           ",
        "So that I can overcome an Spending too Much Time on Unimportant Activities ",
        "As a user                                                                  ",
        "I can Type in My Value Statements                                          ",
    ]);

    f.scenario("Should View the First Value Question", [
        "Given this is the first run            ",
        "When the app is loaded                 ",
        "Then I can see the first value question",
    ], function (step, done) {

            step("Given this is the first run");
            var viewModel = new UI.VMMain(providers_Empty);

            step_WhenTheAppIsLoaded(viewModel, step, function () {
                throw "Not Implemented";
            }, done);
        });


    // Sample Data
    export var providers_Empty: Data.IProviders = {
        userSettings: {},
        config: {}
    };

    // Steps
    export var step_WhenTheAppIsLoaded = function (viewModel: UI.IVMMain, step: (title: string) => void, onLoaded: () => void, onFail: () => void) {
        step("When the app is loaded");

        var onReady = function () {
            onLoaded();
        };

        var onError = function (message: string) {
            ok(false, "ERROR:" + message);
            onFail();
        };

        viewModel.enterValueStatements.showDefault(onReady, onError);
    };
}