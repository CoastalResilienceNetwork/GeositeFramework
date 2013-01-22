using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using Newtonsoft.Json;

namespace GeositeFramework.Models
{
    public class Geosite
    {
        public string title;
        public List<Link> headerLinks;
        public List<Link> sidebarLinks;
        public List<double> initialExtent;
        public List<MapSource> basemaps;
        public List<string> pluginOrder;

        public static Geosite LoadFromJson(string path)
        {
            using (var sr = new StreamReader(path))
            {
                var geositeData = JsonConvert.DeserializeObject<Geosite>(sr.ReadToEnd());
                return geositeData;
            }
        }
    }

    public class Link
    {
        public string text;
        public string url;
    }

    public class MapSource
    {
        public string name;
        public string url;
    }
}