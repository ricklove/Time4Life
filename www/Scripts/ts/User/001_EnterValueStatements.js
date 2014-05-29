/// <reference path="000_MainViewModel.ts" />
var Told;
(function (Told) {
    (function (Time4Life) {
        (function (UI) {
            var VMEnterValueStatements = (function () {
                function VMEnterValueStatements(viewModel) {
                    this.viewModel = viewModel;
                }
                Object.defineProperty(VMEnterValueStatements.prototype, "userSettings", {
                    get: function () {
                        return this.viewModel.providers.userSettings;
                    },
                    enumerable: true,
                    configurable: true
                });

                VMEnterValueStatements.prototype.showDefault = function (onReady, onError) {
                    throw "Not Implemented";
                };
                return VMEnterValueStatements;
            })();
            UI.VMEnterValueStatements = VMEnterValueStatements;
        })(Time4Life.UI || (Time4Life.UI = {}));
        var UI = Time4Life.UI;
    })(Told.Time4Life || (Told.Time4Life = {}));
    var Time4Life = Told.Time4Life;
})(Told || (Told = {}));
