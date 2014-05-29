/// <reference path="AccessUserSettings.ts" />

module Told.Time4Life.Data {

    export interface IProviders {
        userSettings: IUserSettings;
        config: IConfig;
    }

    export interface IConfig {
    }

    export function createDefaultProviders(): IProviders {
        return {
            userSettings: new UserSettings_LocalStorage(),
            config: {}
        };
    }

}