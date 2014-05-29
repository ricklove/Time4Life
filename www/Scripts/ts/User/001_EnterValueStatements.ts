/// <reference path="000_MainViewModel.ts" />

module Told.Time4Life.UI {
    export class VMEnterValueStatements implements IVMEnterValueStatements {

        private viewModel: VMMain;
        private get userSettings() { return this.viewModel.providers.userSettings; }

        constructor(viewModel: VMMain) {
            this.viewModel = viewModel;
        }

        showDefault(onReady: () => void, onError: (message: string) => void) {
            throw "Not Implemented";
        }
    }
}