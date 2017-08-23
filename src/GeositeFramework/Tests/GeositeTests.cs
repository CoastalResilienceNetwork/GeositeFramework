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
        private string baseValidRegionJson = @"
                {
                    'titleMain': {'text':''},
                    'titleDetail': {'text':''},
                    'initialExtent': [0,0,0,0],
                    'basemaps': [{'name':'', 'url':''}]
                ";

        // ------------------------------------------------------------------------
        // Tests for region.json configuration

        private Geosite CreateGeosite(string regionJson)
        {
            return new Geosite(LoadRegionData(regionJson), new List<string>(), new List<string>(), null);
        }

        private Geosite CreateGeosite(string regionJson, List<string> pluginFolderNames, List<string> pluginModuleNames)
        {
            return new Geosite(LoadRegionData(regionJson), pluginFolderNames, pluginModuleNames, null);
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
                    'titleMain': { 'text': 'Geosite Framework Sample', 'url': 'http://www.azavea.com/' },
                    'titleDetail':  { 'text': 'Sample Region', 'url': 'http://www.azavea.com/' },
                    'initialExtent': [ -98.61328125, 17.392579271057766, -79.716796875,31.653381399664 ],
                    'headerLinks': [
                        { 'text': 'Azavea', 'url': 'http://www.azavea.com/' },
                        { 'text': 'GIS', 'url': 'http://en.wikipedia.org/wiki/Geographic_information_system' }
                    ],
                    'regionLinks': [
                        { 'text': 'California', 'url': 'http://maps.coastalresilience.org/california/' },
                        { 'text': 'Connecticut', 'url': 'http://maps.coastalresilience.org/connecticut' },
                        { 'text': 'Global', 'url': 'http://maps.coastalresilience.org/global/' },
                        { 'text': 'Grenada, St. Vincent & the Grenadines', 'url': 'http://maps.coastalresilience.org/gsvg/' },
                        { 'text': 'MesoAmerican Reef', 'url': 'http://maps.coastalresilience.org/mar/' },
                        { 'text': 'New York', 'url': 'http://maps.coastalresilience.org/newyork' },
                        { 'text': 'New Jersey', 'url': 'http://maps.coastalresilience.org/newjersey' },
                        { 'text': 'Southeast Florida', 'url': 'http://maps.coastalresilience.org/seflorida/' },
                        { 'text': 'United States', 'url': 'http://maps.coastalresilience.org/unitedstates/' },
                        { 'text': 'U.S. Virgin Islands', 'url': 'http://maps.coastalresilience.org/usvi/' },
                        { 'text': 'Washington', 'url': 'http://maps.coastalresilience.org/pugetsound' }
                    ],
                    'basemaps': [
                        {
                            'name': 'Topological',
                            'url': 'http://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer'
                        }
                    ],
                    'pluginOrder': [ 'layer_selector', 'measure' ]
                }";
            var pluginFolderNames = new List<string> { "nearshore_waves", "measure", "layer_selector", "explode" };
            var pluginModuleNames = new List<string> { "nearshore_waves/main", "measure/main", "layer_selector/main", "explode/main" };
            var pluginJsonData = new List<JsonData> { LoadPluginData(@"{ css: ['main.css'], use: { underscore: { attach: '_' } } }") };
            var geosite = new Geosite(LoadRegionData(regionJson), pluginFolderNames, pluginModuleNames, pluginJsonData);

            Expect(geosite.TitleMain.Text, EqualTo("Geosite Framework Sample"));
            Expect(geosite.TitleDetail.Text, EqualTo("Sample Region"));
            Expect(geosite.HeaderLinks.Count, EqualTo(3));
            Expect(geosite.HeaderLinks[0].Url, EqualTo("http://www.azavea.com/"));
            Expect(geosite.HeaderLinks[1].Text, EqualTo("GIS"));
            Expect(geosite.PluginModuleIdentifiers, EqualTo("'layer_selector/main', 'measure/main', 'nearshore_waves/main', 'explode/main'"));
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
            Expect(messages[2], Contains(": titleMain, titleDetail, initialExtent, basemaps.")); // missing required properties
        }

        /// <exclude/>
        [Test]
        public void TestGoodColorsJson()
        {
            const string primary = "#C0C0C0", secondary = "#FF11AA";
            var regionJson = baseValidRegionJson + 
                    ",'colors': { 'primary': '" + primary + "',  'secondary': '" + secondary + "'}}";
            var geo = CreateGeosite(regionJson);
            Assert.AreEqual(geo.PrimaryColor, primary);
            Assert.AreEqual(geo.SecondaryColor, secondary);
        }

        /// <exclude/>
        [Test]
        [ExpectedException(typeof(Exception), Handler = "HandleBadJsonColors")]
        public void TestBadColorsJson()
        {
            var regionJson = baseValidRegionJson + 
                    @",'colors': {
                        'primary': 'hot pink',
                        'secondary': 'cool cucumber'
                    }
                }";
            CreateGeosite(regionJson);
        }
        private void HandleBadJsonColors(Exception ex)
        {
            Expect(ex.Message, Contains("Bad color config"));
        }

        /// <exclude/>
        [Test]
        [ExpectedException(typeof(JsonValidationException), Handler = "HandleBadRegionJsonExtent")]
        public void TestBadRegionJsonExtent()
        {
            var regionJson = @"
                {
                    'titleMain': {'text':''},
                    'titleDetail': {'text':''},
                    'initialExtent': [0,0,0],
                    'basemaps': [{'name':'', 'url':''}],
                }";
            CreateGeosite(regionJson);
        }
        private void HandleBadRegionJsonExtent(Exception ex)
        {
            Expect((ex as JsonValidationException).ParseMessages[0], Contains("3 is less than minimum count of 4"));
        }

        // ------------------------------------------------------------------------
        // Tests for plugin.json configuration

        private Geosite CreateGeosite(List<JsonData> pluginConfigJsonData)
        {
            var regionJson = @"
                {
                    'titleMain': {'text':''},
                    'titleDetail': {'text':''},
                    'initialExtent': [0,0,0,0],
                    'basemaps': [{'name':'', 'url':''}]
                }";
            return new Geosite(LoadRegionData(regionJson), new List<string>(), new List<string>(), pluginConfigJsonData);
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