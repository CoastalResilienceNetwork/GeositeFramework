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
        /// Create a Geosite object by loading the "region.json" file from the specified path.
        /// </summary>
        public static Geosite LoadFromJson(string regionJsonFilePath)
        {
            try
            {
                using (var sr = new StreamReader(regionJsonFilePath))
                {
                    var regionDataJson = sr.ReadToEnd();
                    var json = JObject.Parse(regionDataJson);

                    // Create Geosite object, containing just the elements of region.json that
                    // can be rendered server-side. Also include the full text of region.json
                    // to pass to the client.
                    var geositeData = new Geosite
                    {
                        RegionDataJson = regionDataJson,
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
            catch (Exception ex)
            {
                throw new ApplicationException("Exception loading geosite JSON: " + ex.Message);
            }
        }
    }
}
