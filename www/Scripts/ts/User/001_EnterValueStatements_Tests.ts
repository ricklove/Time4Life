/// <reference path="../../typings/qunit/qunit.d.ts" />
/// <reference path="../System/FeatureTests.ts" />
/// <reference path="001_EnterValueStatements.ts" />

module Told.Time4Life.UI.Tests {

    var f = new FeatureTests.Feature("001 - Enter Value Statements", [
        "In order to feel Hope that I can Balance My Life                           ",
        "So that I can overcome Spending too Much Time on Unimportant Activities ",
        "As a user                                                                  ",
        "I can Type in My Value Statements                                          ",
    ]);

    f.scenario("Should View the First Value Question", [
        "Given this is the first run            ",
        "When the app is loaded                 ",
        "Then I can see the first value question",
    ],
        (step, done, fail) => {

            step("Given this is the first run");
            var viewModel = createViewModel_Empty();

            step_WhenTheAppIsLoaded(step, done, fail, viewModel, () => {
                throw "Not Implemented";
            });
        });


    // Sample Data
    export var createViewModel_Empty = function (): IVMMain {
        return new UI.VMMain(providers_Empty);
    };

    export var providers_Empty: Data.IProviders = {
        userSettings: {},
        config: {}
    };

    // Steps
    export var step_WhenTheAppIsLoaded = f.createStepProcess<UI.IVMMain>((step, done, fail, viewModel) => {
        step("When the app is loaded");
        viewModel.enterValueStatements.showDefault(done, fail);
    });
}