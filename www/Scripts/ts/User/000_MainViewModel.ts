/// <reference path="../../typings/jQuery/jQuery.d.ts" />
/// <reference path="../../typings/knockout/knockout.d.ts" />
/// <reference path="../Support/AccessProviders.ts" />
/// <reference path="_Model.ts" />
/// <reference path="001_EnterValueStatements.ts" />

module Told.Time4Life.UI {

    export class VMMain implements IVMMain {

        public providers: Data.IProviders;
        public enterValueStatements: IVMEnterValueStatements;

        constructor(providers?: Data.IProviders) {

            if (providers == null) {
                providers = Data.createDefaultProviders();
            }

            this.providers = providers;

            this.enterValueStatements = new VMEnterValueStatements(this);
        }
    }

}