using NUnit.Framework;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using GeositeFramework.Models;
using Newtonsoft.Json.Linq;

namespace GeositeFramework.Tests
{
    [TestFixture]
    public class GeositeTests
    {
        /// <exclude/>
        [Test]
        public void TestSuccess()
        {
            var regionJson = @"
                {
                    'title': 'Geosite Framework Sample',
                    'headerLinks': [
                        { 'text': 'Azavea', 'url': 'http://www.azavea.com/' },
                        { 'text': 'GIS', 'url': 'http://en.wikipedia.org/wiki/Geographic_information_system' }
                    ],
                    'pluginOrder': [ 'layer_selector', 'measure' ]
                }";
            var pluginFolderNames = new List<string> { "nearshore_waves", "measure", "layer_selector", "explode"};
            var geosite = new Geosite(regionJson, pluginFolderNames);

            Assert.AreEqual(geosite.Title, "Geosite Framework Sample");
            Assert.AreEqual(geosite.HeaderLinks.Count, 2);
            Assert.AreEqual(geosite.HeaderLinks[0].Url, "http://www.azavea.com/");
            Assert.AreEqual(geosite.HeaderLinks[1].Text, "GIS");

            var jsonObj = JObject.Parse(geosite.RegionDataJson);
            var orderedFolderNames = jsonObj["pluginFolderNames"].Select(t => (string)t).ToList();
            Assert.AreEqual(orderedFolderNames, new List<string> { "layer_selector", "measure", "nearshore_waves", "explode" });
        }

        /// <exclude/>
        [Test]
        [ExpectedException(typeof(Newtonsoft.Json.JsonReaderException), ExpectedMessage = "Unexpected character", MatchType = MessageMatch.Contains)]
        public void TestInvalidJson()
        {
            var regionJson = @"This is not valid JSON {['";
            var pluginFolderNames = new List<string>();
            var geosite = new Geosite(regionJson, pluginFolderNames);
        }

        /// <exclude/>
        [Test]
        [ExpectedException(typeof(ApplicationException), ExpectedMessage = "XYZ", MatchType = MessageMatch.Contains)]
        public void TestMissingPlugin()
        {
            var regionJson = @"
                {
                    'title': 'Ignore',
                    'headerLinks': [],
                    'pluginOrder': [ 'layer_selector', 'XYZ' ]
                }";
            var pluginFolderNames = new List<string> { "nearshore_waves", "measure", "layer_selector", "explode" };
            var geosite = new Geosite(regionJson, pluginFolderNames);
        }
    }
}