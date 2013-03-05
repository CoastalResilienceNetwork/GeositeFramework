using NUnit.Framework;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using GeositeFramework.Models;
using Newtonsoft.Json.Linq;
using System.IO;

namespace GeositeFramework.Tests
{
    [TestFixture]
    public class GeositeTests : AssertionHelper
    {
        private static readonly List<string> dummyPluginFolderNames = new List<string>();
        private static readonly string appDataFolderPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, @"..\App_Data");

        /// <exclude/>
        [Test]
        public void TestSuccess()
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
            var geosite = new Geosite(regionJson, pluginFolderNames, appDataFolderPath);

            Expect(geosite.Organization, EqualTo("Sample Org"));
            Expect(geosite.Title, EqualTo("Geosite Framework Sample"));
            Expect(geosite.HeaderLinks.Count, EqualTo(2));
            Expect(geosite.HeaderLinks[0].Url, EqualTo("http://www.azavea.com/"));
            Expect(geosite.HeaderLinks[1].Text, EqualTo("GIS"));
            Expect(geosite.PluginModuleIdentifiers, EqualTo("'plugins/layer_selector/main', 'plugins/measure/main', 'plugins/nearshore_waves/main', 'plugins/explode/main'"));
            Expect(geosite.PluginVariableNames, EqualTo("p0, p1, p2, p3"));

            // Test that "pluginFolderNames" was correctly added to the JSON
            var jsonObj = JObject.Parse(geosite.RegionDataJson);
            var orderedFolderNames = jsonObj["pluginFolderNames"].Select(t => (string)t).ToList();
            Expect(orderedFolderNames, EqualTo(new List<string> { "layer_selector", "measure", "nearshore_waves", "explode" }));
        }

        /// <exclude/>
        [Test]
        [ExpectedException(typeof(GeositeJsonParseException), Handler = "HandleInvalidJson")]
        public void TestInvalidJson()
        {
            var regionJson = @"This is not valid JSON {['";
            new Geosite(regionJson, dummyPluginFolderNames, appDataFolderPath);
        }
        private void HandleInvalidJson(Exception ex)
        {
            Expect((ex as GeositeJsonParseException).ParseMessages[0], Contains("Unexpected character"));
        }

        /// <exclude/>
        [Test]
        [ExpectedException(typeof(GeositeJsonParseException), Handler = "HandleWrongProperties")]
        public void TestWrongProperties()
        {
            var regionJson = @"{'a':'', 'b':''}";
            new Geosite(regionJson, dummyPluginFolderNames, appDataFolderPath);
        }
        private void HandleWrongProperties(Exception ex)
        {
            var messages = (ex as GeositeJsonParseException).ParseMessages;
            Expect(messages.Count, EqualTo(3));
            Expect(messages[0], Contains("'a'")); // extra property
            Expect(messages[1], Contains("'b'")); // extra property
            Expect(messages[2], Contains(": organization, title, initialExtent, basemaps.")); // missing required properties
        }

        /// <exclude/>
        [Test]
        [ExpectedException(typeof(GeositeJsonParseException), Handler = "HandleBadExtent")]
        public void TestBadExtent()
        {
            var regionJson = @"
                {
                    'organization': '',
                    'title': '',
                    'initialExtent': [0,0,0],
                    'basemaps': [{'name':'', 'url':''}],
                }";
            new Geosite(regionJson, dummyPluginFolderNames, appDataFolderPath);
        }
        private void HandleBadExtent(Exception ex)
        {
            Expect((ex as GeositeJsonParseException).ParseMessages[0], Contains("3 is less than minimum count of 4"));
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
            new Geosite(regionJson, pluginFolderNames, appDataFolderPath);
        }
    }
}