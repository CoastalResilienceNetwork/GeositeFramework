// Module WmsLoader.js

define(["jquery", "use!underscore"],
    function ($, _) {
        var WmsLoader = function (baseUrl, folderName) {
            var _baseUrl = baseUrl,
                _folderName = folderName,
                _onLoadingComplete = null,
                _onLoadingError = null;

            // Use the catalog data to build a node tree. The node schema targets Ext.data.TreeStore 
            // and Ext.tree.Panel, but should be generic enough for other UI frameworks.

            this.load = loadCatalog;

            function loadCatalog(rootNode, onLoadingComplete, onLoadingError) {
                // Load root catalog entries
                _onLoadingComplete = onLoadingComplete;
                _onLoadingError = onLoadingError;
                _onLoadingComplete(_baseUrl);
            }
        }

        return WmsLoader;
    }
);