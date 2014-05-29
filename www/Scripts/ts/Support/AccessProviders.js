/// <reference path="AccessUserSettings.ts" />
var Told;
(function (Told) {
    (function (Time4Life) {
        (function (Data) {
            function createDefaultProviders() {
                return {
                    userSettings: new Told.Time4Life.Data.UserSettings_LocalStorage(),
                    config: {}
                };
            }
            Data.createDefaultProviders = createDefaultProviders;
        })(Time4Life.Data || (Time4Life.Data = {}));
        var Data = Time4Life.Data;
    })(Told.Time4Life || (Told.Time4Life = {}));
    var Time4Life = Told.Time4Life;
})(Told || (Told = {}));
