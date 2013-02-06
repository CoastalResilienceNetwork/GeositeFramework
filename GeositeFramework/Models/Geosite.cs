using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
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
        public string RegionDataJson { get; private set; }
        public string Title { get; private set; }
        public List<Link> HeaderLinks { get; private set; }

        /// <summary>
        /// Create a Geosite object by loading the "region.json" file and enumerating plug-ins, using the specified paths.
        /// </summary>
        public static Geosite LoadSiteData(string regionJsonFilePath, string pluginsFolderPath)
        {
            try
            {
                using (var sr = new StreamReader(regionJsonFilePath))
                {
                    var regionJson = sr.ReadToEnd();
                    var pluginFolderNames = Directory.EnumerateDirectories(pluginsFolderPath).Select(p => Path.GetFileName(p)).ToList();
                    return new Geosite(regionJson, pluginFolderNames);
                }
            }
            catch (Exception ex)
            {
                //TODO: log it using log4net
                throw new ApplicationException("Exception loading geosite JSON: " + ex.Message);
            }
        }

        private Geosite() {}  // The compiler wants this for some reason

        /// <summary>
        /// Make a Geosite object given the specified configuration info.
        /// </summary>
        /// <param name="regionJson">A JSON configuration string (e.g. contents of the "region.json" configuration file)</param>
        /// <param name="existingPluginFolderNames">A list of plugin folder names (not full paths -- relative to the site "plugins" folder)</param>
        public Geosite(string regionJson, List<string> existingPluginFolderNames)
        {
            var jsonObj = JObject.Parse(regionJson);

            // Get plugin folder names, in the specified order
            var specifiedFolderNames = jsonObj["pluginOrder"].Select(t => (string)t).ToList();
            var folderNames = GetOrderedPluginFolderNames(existingPluginFolderNames, specifiedFolderNames);

            // Augment the JSON so the client will have the full list of folder names
            jsonObj.Add("pluginFolderNames", new JArray(folderNames.ToArray()));

            // Set public properties needed for View rendering
            Title = (string)jsonObj["title"];
            HeaderLinks = jsonObj["headerLinks"]
                .Select(j => new Link
                {
                    Text = (string)j["text"],
                    Url = (string)j["url"]
                }).ToList();
            RegionDataJson = jsonObj.ToString();
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
                    //TODO: log it using log4net
                    throw new ApplicationException("Specified plugin folder not found: " + folderName);
                }
            }
            // Append any existing folder names that weren't specified
            retVal.AddRange(existingNames);
            return retVal;
        }

    }
}
