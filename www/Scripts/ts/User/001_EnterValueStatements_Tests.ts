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

        });
}