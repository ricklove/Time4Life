module Told.Time4Life.UI {
    export interface IVMMain {
        enterValueStatements: IVMEnterValueStatements;
    }

    export interface IVMEnterValueStatements {
        showDefault(onReady: () => void, onError: (message: string) => void);
    }
}