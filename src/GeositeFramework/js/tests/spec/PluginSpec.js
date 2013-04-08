describe('Plugin', function() {
    it('exists under Geosite.models', function() {
        expect(Geosite).toBeDefined();
        expect(Geosite.models).toBeDefined();
        expect(Geosite.models.Plugin).toBeDefined();
    });

    describe("instance", function() {
        var plugin;
        beforeEach(function() {

            // Give it a bogus plugin object to work with
            // Rather than bringing up actual plugins that
            // could themselves be broken.
            bogusPluginObject = {
                activate: function () { console.log("bogusPluginObject - activated") },
                deactivate: function () { console.log("bogusPluginObject - deactivated") }
            };

            plugin = new Geosite.models.Plugin({ 
                pluginObject: bogusPluginObject });
        });

        it('has an intialize method', function() {
            expect(plugin.initialize).toBeAFunction();
        });
    });
});
