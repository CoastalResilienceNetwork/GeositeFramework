using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using GeositeFramework.Helpers;
using Newtonsoft.Json.Linq;

namespace GeositeFramework.Models
{
    /// <summary>
    /// View model for creating the main geosite view (Views/Home/Index.cshtml).
    /// </summary>
    public class Geosite
    {
        public class Link
        {
            public string Text;
            public string Url;
        }

        // Properties used in View rendering
        public string GeositeFrameworkVersion { get; set; }
        public string Organization { get; private set; }
        public string Title { get; private set; }
        public List<Link> HeaderLinks { get; private set; }
        public string RegionDataJson { get; private set; }
        public List<string> PluginFolderNames { get; private set; }
        public string PluginModuleIdentifiers { get; private set; }
        public string PluginVariableNames { get; private set; }
        public List<string> PluginCssUrls { get; private set; }
        public string ConfigurationForUseJs { get; private set; }

        /// <summary>
        /// Create a Geosite object by loading the "region.json" file and enumerating plug-ins, using the specified paths.
        /// </summary>
        public static Geosite LoadSiteData(string regionJsonFilePath, string pluginsFolderPath, string appDataFolderPath)
        {
            var jsonDataRegion = new JsonDataRegion(appDataFolderPath).LoadFile(regionJsonFilePath);
            var pluginFolderPaths = Directory.EnumerateDirectories(pluginsFolderPath);
            var pluginConfigData = GetPluginConfigurationData(pluginFolderPaths, appDataFolderPath);
            var pluginFolderNames = pluginFolderPaths.Select(p => Path.GetFileName(p)).ToList();
            var geosite = new Geosite(jsonDataRegion, pluginFolderNames, pluginConfigData);
            return geosite;
        }

        private static List<JsonData> GetPluginConfigurationData(IEnumerable<string> pluginFolderPaths, string appDataFolderPath)
        {
            var pluginJsonFilename = "plugin.json";
            var pluginConfigData = new List<JsonData>();
            foreach (var path in pluginFolderPaths)
            {
                // Make sure main.js exists
                if (!File.Exists(Path.Combine(path, "main.js")))
                {
                    throw new ApplicationException("Missing 'main.js' file in plugin folder: " + path);
                }

                // Get plugin.json data if present
                var pluginJsonPath = Path.Combine(path, pluginJsonFilename);
                if (File.Exists(pluginJsonPath))
                {
                    var jsonData = new JsonDataPlugin(appDataFolderPath).LoadFile(pluginJsonPath);
                    pluginConfigData.Add(jsonData);
                }
            }
            return pluginConfigData;
        }

        /// <summary>
        /// Make a Geosite object given the specified configuration info. 
        /// Note this is public only for testing purposes.
        /// </summary>
        /// <param name="jsonDataRegion">JSON configuration data (e.g. from a "region.json" configuration file)</param>
        /// <param name="existingPluginFolderNames">A list of plugin folder names (not full paths -- relative to the site "plugins" folder)</param>
        public Geosite(JsonData jsonDataRegion, List<string> existingPluginFolderNames, List<JsonData> pluginConfigJsonData)
        {
            // Validate the region configuration JSON
            var jsonObj = jsonDataRegion.Validate();

            // Get plugin folder names, in the specified order
            if (jsonObj["pluginOrder"] == null)
            {
                PluginFolderNames = existingPluginFolderNames;
            }
            else
            {
                var specifiedFolderNames = jsonObj["pluginOrder"].Select(t => (string)t).ToList();
                PluginFolderNames = GetOrderedPluginFolderNames(existingPluginFolderNames, specifiedFolderNames);
            }

            // Augment the JSON so the client will have the full list of folder names
            jsonObj.Add("pluginFolderNames", new JArray(PluginFolderNames.ToArray()));

            // Set public properties needed for View rendering
            Organization = (string)jsonObj["organization"];
            Title = (string)jsonObj["title"];

            if (jsonObj["headerLinks"] != null)
            {
                HeaderLinks = jsonObj["headerLinks"]
                    .Select(j => new Link
                    {
                        Text = (string)j["text"],
                        Url = (string)j["url"]
                    }).ToList();
            }

            // JSON to be inserted in generated JavaScript code
            RegionDataJson = jsonObj.ToString();

            // Create plugin module identifiers, to be inserted in generated JavaScript code. Example:
            //     "'plugins/layer_selector/main', 'plugins/measure/main'"
            PluginModuleIdentifiers = string.Join(", ", PluginFolderNames.Select(name => string.Format("'plugins/{0}/main'", name)));

            // Create plugin variable names, to be inserted in generated JavaScript code. Example:
            //     "p0, p1"
            PluginVariableNames = string.Join(", ", PluginFolderNames.Select((name, i) => string.Format("p{0}", i)));

            if (pluginConfigJsonData != null)
            {
                MergePluginConfigurationData(this, pluginConfigJsonData);
            }
        }

        private static List<string> GetOrderedPluginFolderNames(List<string> existingFolderNames, List<string> specifiedFolderNames)
        {
            var retVal = new List<string>();
            var existingNames = new List<string>(existingFolderNames); // copy input argument so we don't modify it

            // The "specified" folder names are in the desired order. 
            // Make sure each exists and remove it from the list of existing folder names.
            foreach (var folderName in specifiedFolderNames)
            {
                if (existingFolderNames.Contains(folderName))
                {
                    retVal.Add(folderName);
                    existingNames.Remove(folderName);
                }
                else
                {
                    throw new ApplicationException("Specified plugin folder not found: " + folderName);
                }
            }
            // Append any existing folder names that weren't specified
            retVal.AddRange(existingNames);
            return retVal;
        }

        // Example plugin.json file:
        // {
        //     css: [
        //         "plugins/layer_selector/main.css",
        //         "//cdn.sencha.io/ext-4.1.1-gpl/resources/css/ext-all.css"
        //     ],
        //     use: {
        //         underscore: { attach: "_" },
        //         extjs: { attach: "Ext" }
        //     }
        // }

        private static void MergePluginConfigurationData(Geosite geosite, List<JsonData> pluginConfigData)
        {
            var cssUrls = new List<string>();
            var useClauses = new List<string>();
            var useClauseDict = new Dictionary<string, string>();
            foreach (var jsonData in pluginConfigData)
            {
                // Parse and validate the plugin's JSON configuration data
                var jsonObj = jsonData.Validate();

                JToken token;
                if (jsonObj.TryGetValue("css", out token))
                {
                    // This config has CSS urls - add them to the list
                    cssUrls.AddRange(token.Values<string>());
                }
                if (jsonObj.TryGetValue("use", out token))
                {
                    // This config has "use" clauses - add unique ones to the list
                    foreach (JProperty p in token.Children())
                    {
                        var value = Regex.Replace(p.Value.ToString(), @"\s", ""); // remove whitespace
                        if (useClauseDict.ContainsKey(p.Name))
                        {
                            if (useClauseDict[p.Name] != value)
                            {
                                var message = string.Format(
                                    "Plugins define 'use' clause '{0}' differently: '{1}' vs. '{2}'",
                                    p.Name, value, useClauseDict[p.Name]);
                                throw new ApplicationException(message);
                            }
                        }
                        else
                        {
                            useClauseDict[p.Name] = value;
                            useClauses.Add(p.ToString());
                        }
                    }
                }
            }
            geosite.PluginCssUrls = cssUrls;
            geosite.ConfigurationForUseJs = string.Join("," + Environment.NewLine, useClauses);
        }

    }
}
