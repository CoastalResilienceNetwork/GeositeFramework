define(
    ["dojo/_base/declare"],
    function (declare) {

        var baseUrl = 'http://dev.gulfmex.coastalresilience.org/arcgis/rest/services';

        // Load hierarchy of folders, services, and layers from an ArcGIS Server via its REST API.
        // The catalog root contains folders and/or services.
        // Each folder contains additional services.
        // Each "MapServer" service exposes a number of layers.
        // A layer entry may actually be a group, containing other layers in the same collection.

        function loadCatalog() {
            // Load root catalog entries
            loadFolder("", function (entries) {
                console.log("Catalog has " + entries.folders.length + " folders");
                // Root catalog has loaded -- load its folder and service entries
                loadFolders(entries.folders, entries.services);
            });
        }

        function loadFolders(folderNames, serviceSpecs) {
            // Start loading all folders, keeping "deferred" objects so we know when they're done
            var deferreds = _.map(folderNames, function (folderName) {
                return loadFolder(folderName, function (entries) {
                    console.log("Folder " + folderName + " has " + entries.services.length + " services");
                    // Folder has loaded -- add its services to "serviceSpecs"
                    $.merge(serviceSpecs, entries.services);
                });
            });
            // When all folders have loaded, load the services
            $.when.apply($, deferreds).then(function () {
                loadServices(serviceSpecs);
            });
        }

        function loadFolder(folderName, success) {
            console.log("Loading folder '" + folderName + "'");
            return $.ajax({
                dataType: 'jsonp',
                url: baseUrl + (folderName === "" ? "" : "/" + folderName) + '?f=json',
                success: success,
                error: handleAjaxError
            });
        }

        function loadServices(services) {
            // Start loading all services, keeping "deferred" objects so we know when they're done
            console.log("Loading " + services.length + " services");
            var deferreds = _.map(services, loadService);
            // When all services have loaded, we're done!
            $.when.apply($, deferreds).then(function () {
                console.log("All done!");
            });
        }

        function loadService(serviceSpec) {
            if (serviceSpec.type === "MapServer") {
                console.log("Loading service " + serviceSpec.name);
                return $.ajax({
                    dataType: 'jsonp',
                    url: baseUrl + "/" + serviceSpec.name + "/MapServer?f=json",
                    success: function (serviceData) {
                        console.log("Service " + serviceSpec.name + " has " + serviceData.layers.length + " layers");
                    },
                    error: handleAjaxError
                });
            }
        }

        function handleAjaxError(jqXHR, textStatus, errorThrown) {
            alert('error');
        }

        return declare(null, {
            toolbarName: "Map Layers",
            fullName: "Configure and control layers to be overlayed on the base map.",

            constructor: function (args) {
                declare.safeMixin(this, args);
                loadCatalog();
            }
        });
    }
);