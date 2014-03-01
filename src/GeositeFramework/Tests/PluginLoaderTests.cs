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
    public class PluginLoaderTests : AssertionHelper
    {
        [Test]
        public void TestSortPluginNames()
        {
            List<string> orderBy = new List<string> { "A", "B", "C" };
            List<string> pluginNames = new List<string> { "C", "X", "B", "A" };
            Func<string, int> keyFunc = x => orderBy.IndexOf(x);
            PluginLoader.SortPluginNames(pluginNames, keyFunc);
            Assert.AreEqual("A", pluginNames[0]);
            Assert.AreEqual("B", pluginNames[1]);
            Assert.AreEqual("C", pluginNames[2]);
            Assert.AreEqual("X", pluginNames[3]);
        }

        [Test]
        public void TestSortPluginNamesWithStripPluginModule()
        {
            List<string> orderBy = new List<string> { "A", "B", "C" };
            List<string> pluginNames = new List<string> { "plugin/C", "plugin/X", "sample_plugin/B", "plugin/A" };
            Func<string, int> keyFunc = x => orderBy.IndexOf(PluginLoader.StripPluginModule(x));
            PluginLoader.SortPluginNames(pluginNames, keyFunc);
            Assert.AreEqual("plugin/A", pluginNames[0]);
            Assert.AreEqual("sample_plugin/B", pluginNames[1]);
            Assert.AreEqual("plugin/C", pluginNames[2]);
            Assert.AreEqual("plugin/X", pluginNames[3]);
        }
    }
}