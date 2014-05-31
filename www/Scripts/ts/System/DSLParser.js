/// <reference path="Told.Utils.ts" />
var Told;
(function (Told) {
    (function (DSL) {
        function loadDslDefinition(documentUrl, onLoaded, onError) {
            var url = documentUrl;

            Told.Utils.loadTextFile(documentUrl, function (text) {
                return parseDslDefinition(text);
            }, onError);
        }
        DSL.loadDslDefinition = loadDslDefinition;

        function parseDslDefinition(documentText) {
            throw "Not Implemented";
        }
        DSL.parseDslDefinition = parseDslDefinition;
    })(Told.DSL || (Told.DSL = {}));
    var DSL = Told.DSL;
})(Told || (Told = {}));
