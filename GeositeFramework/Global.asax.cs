using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Hosting;
using System.Web.Http;
using System.Web.Mvc;
using System.Web.Routing;
using GeositeFramework.Models;

namespace GeositeFramework
{
    public class MvcApplication : System.Web.HttpApplication
    {
        private Geosite geositeData;
        public Geosite GeositeData
        {
            get
            {
                if (geositeData == null)
                {
                    string configFilePath = HostingEnvironment.MapPath("~/region.json");
                    string pluginsFolderPath = HostingEnvironment.MapPath("~/plugins");
                    if (!File.Exists(configFilePath))
                    {
                        throw new FileNotFoundException("Site configuration file not found: " + configFilePath);
                    }
                    if (!Directory.Exists(pluginsFolderPath))
                    {
                        throw new FileNotFoundException("Plugins folder not found: " + pluginsFolderPath);
                    }
                    geositeData = Geosite.LoadSiteData(configFilePath, pluginsFolderPath);
                }
                return geositeData;
            }
        }

        protected void Application_Start()
        {
            AreaRegistration.RegisterAllAreas();

            WebApiConfig.Register(GlobalConfiguration.Configuration);
            FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
            RouteConfig.RegisterRoutes(RouteTable.Routes);


        }
    }
}