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

        public string RegionDataJson;
        public string Title;
        public List<Link> HeaderLinks;

        /// <summary>
        /// Create a Geosite object by loading the "region.json" file and enumerating plug-ins using the specified paths.
        /// </summary>
        public static Geosite LoadSiteData(string regionJsonFilePath, string pluginsFolderPath)
        {
            try
            {
                using (var sr = new StreamReader(regionJsonFilePath))
                {
                    var json = JObject.Parse(sr.ReadToEnd());

                    // Get plugin folder names
                    var existingFolderNames = Directory.EnumerateDirectories(pluginsFolderPath).Select(p => Path.GetFileName(p)).ToList();
                    var specifiedFolderNames = json["pluginOrder"].Select(t => (string)t).ToList();
                    var folderNames = GetPluginFolderNames(existingFolderNames, specifiedFolderNames);
                    json.Add("pluginFolderNames", new JArray(folderNames.ToArray()));

                    // Create view model for main page 
                    var geosite = ExtractServerSideConfigData(json);
                    geosite.RegionDataJson = json.ToString();
                    return geosite;
                }
            }
            catch (Exception ex)
            {
                //TODO: log it using log4net
                throw new ApplicationException("Exception loading geosite JSON: " + ex.Message);
            }
        }

        private static List<string> GetPluginFolderNames(List<string> existingFolderNames, List<string> specifiedFolderNames)
        {
            var retVal = new List<string>();

            // The specified folder names are in the desired order. 
            // Make sure each exists and remove it from the list of existing folder names.
            foreach (var folderName in specifiedFolderNames)
            {
                if (existingFolderNames.Contains(folderName))
                {
                    retVal.Add(folderName);
                    existingFolderNames.Remove(folderName);
                }
                else
                {
                    //TODO: log it using log4net
                    throw new ApplicationException("Specified plugin folder not found: " + folderName);
                }
            }
            // Append any existing folder names that weren't specified
            retVal.AddRange(existingFolderNames);
            return retVal;
        }

        private static Geosite ExtractServerSideConfigData(JObject json)
        {
            // Create Geosite object, containing just the JSON elements that can be rendered server-side. 
            var geositeData = new Geosite
            {
                Title = (string)json["title"],
                HeaderLinks = json["headerLinks"]
                    .Select(j => new Link
                    {
                        Text = (string)j["text"],
                        Url = (string)j["url"]
                    }).ToList()
            };
            return geositeData;
        }

    }
}
