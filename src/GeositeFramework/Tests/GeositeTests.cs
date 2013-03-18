using NUnit.Framework;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using GeositeFramework.Models;
using Newtonsoft.Json.Linq;
using System.IO;
using GeositeFramework.Helpers;

namespace GeositeFramework.Tests
{
    [TestFixture]
    public class GeositeTests : AssertionHelper
    {
        private static readonly string _appDataFolderPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, @"..\App_Data");

        // ------------------------------------------------------------------------
        // Tests for region.json configuration

        private Geosite CreateGeosite(string regionJson)
        {
            return new Geosite(LoadRegionData(regionJson), new List<string>(), null);
        }

        private Geosite CreateGeosite(string regionJson, List<string> pluginFolderNames)
        {
            return new Geosite(LoadRegionData(regionJson), pluginFolderNames, null);
        }

        private JsonData LoadRegionData(string regionJson)
        {
            return new JsonDataRegion(_appDataFolderPath).LoadText(regionJson);
        }

        [Test]
        public void TestValidRegionData()
        {
            var regionJson = @"
                {
                    'organization': 'Sample Org',
                    'title': 'Geosite Framework Sample',
                    'initialExtent': [ -98.61328125, 17.392579271057766, -79.716796875,31.653381399664 ],
                    'headerLinks': [
                        { 'text': 'Azavea', 'url': 'http://www.azavea.com/' },
                        { 'text': 'GIS', 'url': 'http://en.wikipedia.org/wiki/Geographic_information_system' }
                    ],
                    'basemaps': [
                        {
                            'name': 'Topological',
                            'url': 'http://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer'
                        }
                    ],
                    'pluginOrder': [ 'layer_selector', 'measure' ]
                }";
            var pluginFolderNames = new List<string> { "nearshore_waves", "measure", "layer_selector", "explode"};
            var pluginJsonData = new List<JsonData> { LoadPluginData(@"{ css: ['main.css'], use: { underscore: { attach: '_' } } }") };
            var geosite = new Geosite(LoadRegionData(regionJson), pluginFolderNames, pluginJsonData);

            Expect(geosite.Organization, EqualTo("Sample Org"));
            Expect(geosite.Title, EqualTo("Geosite Framework Sample"));
            Expect(geosite.HeaderLinks.Count, EqualTo(2));
            Expect(geosite.HeaderLinks[0].Url, EqualTo("http://www.azavea.com/"));
            Expect(geosite.HeaderLinks[1].Text, EqualTo("GIS"));
            Expect(geosite.PluginModuleIdentifiers, EqualTo("'plugins/layer_selector/main', 'plugins/measure/main', 'plugins/nearshore_waves/main', 'plugins/explode/main'"));
            Expect(geosite.PluginVariableNames, EqualTo("p0, p1, p2, p3"));
            Expect(geosite.PluginCssUrls, Contains("main.css"));
            Expect(geosite.ConfigurationForUseJs, Contains("underscore"));

            // Test that "pluginFolderNames" was correctly added to the JSON
            var jsonObj = JObject.Parse(geosite.RegionDataJson);
            var orderedFolderNames = jsonObj["pluginFolderNames"].Select(t => (string)t).ToList();
            Expect(orderedFolderNames, EqualTo(new List<string> { "layer_selector", "measure", "nearshore_waves", "explode" }));
        }

        [Test]
        [ExpectedException(typeof(JsonValidationException), Handler = "HandleInvalidRegionJson")]
        public void TestInvalidRegionJson()
        {
            CreateGeosite(@"This is not valid JSON {['");
        }
        private void HandleInvalidRegionJson(Exception ex)
        {
            Expect((ex as JsonValidationException).ParseMessages[0], Contains("Unexpected character"));
        }

        /// <exclude/>
        [Test]
        [ExpectedException(typeof(JsonValidationException), Handler = "HandleWrongRegionJsonProperties")]
        public void TestWrongRegionJsonProperties()
        {
            CreateGeosite(@"{'a':'', 'b':''}");
        }
        private void HandleWrongRegionJsonProperties(Exception ex)
        {
            var messages = (ex as JsonValidationException).ParseMessages;
            Expect(messages.Count, EqualTo(3));
            Expect(messages[0], Contains("'a'")); // extra property
            Expect(messages[1], Contains("'b'")); // extra property
            Expect(messages[2], Contains(": organization, title, initialExtent, basemaps.")); // missing required properties
        }

        /// <exclude/>
        [Test]
        [ExpectedException(typeof(JsonValidationException), Handler = "HandleBadRegionJsonExtent")]
        public void TestBadRegionJsonExtent()
        {
            var regionJson = @"
                {
                    'organization': '',
                    'title': '',
                    'initialExtent': [0,0,0],
                    'basemaps': [{'name':'', 'url':''}],
                }";
            CreateGeosite(regionJson);
        }
        private void HandleBadRegionJsonExtent(Exception ex)
        {
            Expect((ex as JsonValidationException).ParseMessages[0], Contains("3 is less than minimum count of 4"));
        }

        /// <exclude/>
        [Test]
        [ExpectedException(typeof(ApplicationException), ExpectedMessage = "XYZ", MatchType = MessageMatch.Contains)]
        public void TestMissingPlugin()
        {
            var regionJson = @"
                {
                    'organization': '',
                    'title': '',
                    'initialExtent': [0,0,0,0],
                    'basemaps': [{'name':'', 'url':''}],
                    'pluginOrder': [ 'layer_selector', 'XYZ' ]
                }";
            var pluginFolderNames = new List<string> { "nearshore_waves", "measure", "layer_selector", "explode" };
            CreateGeosite(regionJson, pluginFolderNames);
        }

        // ------------------------------------------------------------------------
        // Tests for plugin.json configuration

        private Geosite CreateGeosite(List<JsonData> pluginConfigJsonData)
        {
            string regionJson = @"
                {
                    'organization': '',
                    'title': '',
                    'initialExtent': [0,0,0,0],
                    'basemaps': [{'name':'', 'url':''}]
                }";
            return new Geosite(LoadRegionData(regionJson), new List<string>(), pluginConfigJsonData);
        }

        private JObject ParsePluginData(string pluginJson)
        {
            return LoadPluginData(pluginJson).Validate();
        }

        private JsonData LoadPluginData(string pluginJson)
        {
            return new JsonDataPlugin(_appDataFolderPath).LoadText(pluginJson);
        }

        [Test]
        public void TestValidPluginData()
        {
            var pluginJson = @"
                {
                    css: [
                        'plugins/layer_selector/main.css',
                        '//cdn.sencha.io/ext-4.1.1-gpl/resources/css/ext-all.css'
                    ],
                    use: {
                        underscore: { attach: '_' },
                        tv4: { attach: 'tv4' },
                        extjs: { attach: 'Ext' }
                    }
                }";
            var jsonObj = ParsePluginData(pluginJson);

            Expect(jsonObj.GetValue("css").Values<string>().Count(), EqualTo(2));
            Expect(jsonObj.GetValue("use").Values<JProperty>().Count(), EqualTo(3));
        }

        [Test]
        [ExpectedException(typeof(JsonValidationException), Handler = "HandleInvalidPluginJson")]
        public void TestInvalidPluginJson()
        {
            ParsePluginData(@"This is not valid JSON {['");
        }
        private void HandleInvalidPluginJson(Exception ex)
        {
            Expect((ex as JsonValidationException).ParseMessages[0], Contains("Unexpected character"));
        }

        [Test]
        [ExpectedException(typeof(JsonValidationException), Handler = "HandleWrongPluginJsonProperties")]
        public void TestWrongPluginJsonProperties()
        {
            ParsePluginData(@"{a:'', b:''}");
        }
        private void HandleWrongPluginJsonProperties(Exception ex)
        {
            var messages = (ex as JsonValidationException).ParseMessages;
            Expect(messages.Count, EqualTo(2));
            Expect(messages[0], Contains("'a'")); // extra property
            Expect(messages[1], Contains("'b'")); // extra property
        }

        [Test]
        [ExpectedException(typeof(JsonValidationException), Handler = "HandlePluginCssNotList")]
        public void TestPluginCssNotList()
        {
            ParsePluginData(@"{css: 'foo.css'}");
        }
        private void HandlePluginCssNotList(Exception ex)
        {
            Expect((ex as JsonValidationException).ParseMessages[0], Contains("Expected Array but got String"));
        }

        [Test]
        [ExpectedException(typeof(JsonValidationException), Handler = "HandlePluginUseNotObject")]
        public void TestPluginUseNotObject()
        {
            ParsePluginData(@"{use: 'underscore'}");
        }
        private void HandlePluginUseNotObject(Exception ex)
        {
            Expect((ex as JsonValidationException).ParseMessages[0], Contains("Expected Object but got String"));
        }

        [Test]
        [ExpectedException(typeof(ApplicationException), ExpectedMessage = "clause 'underscore' differently", MatchType = MessageMatch.Contains)]
        public void TestPluginUseConflict()
        {
            var jsonData = new List<JsonData> 
            {
                LoadPluginData(@"{ use: { underscore: { attach: '_' } } }"),
                LoadPluginData(@"{ use: { underscore: { attach: '_2' } } }")
            };
            CreateGeosite(jsonData);
        }

    }
}