/// <reference path="../../typings/jQuery/jQuery.d.ts" />
/// <reference path="../../typings/knockout/knockout.d.ts" />
/// <reference path="../Support/AccessProviders.ts" />
/// <reference path="_Model.ts" />
/// <reference path="001_EnterValueStatements.ts" />
var Told;
(function (Told) {
    (function (Time4Life) {
        (function (UI) {
            var VMMain = (function () {
                function VMMain(providers) {
                    if (providers == null) {
                        providers = Told.Time4Life.Data.createDefaultProviders();
                    }

                    this.providers = providers;

                    this.enterValueStatements = new Told.Time4Life.UI.VMEnterValueStatements(this);
                }
                return VMMain;
            })();
            UI.VMMain = VMMain;
        })(Time4Life.UI || (Time4Life.UI = {}));
        var UI = Time4Life.UI;
    })(Told.Time4Life || (Told.Time4Life = {}));
    var Time4Life = Told.Time4Life;
})(Told || (Told = {}));
