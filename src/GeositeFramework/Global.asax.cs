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
using log4net;

namespace GeositeFramework
{
    public class MvcApplication : System.Web.HttpApplication
    {
        private string geositeFrameworkVersion = "1.0.0";

        private Geosite geositeData;
        public Geosite GeositeData
        {
            get
            {
                if (geositeData == null)
                {
                    string configFilePath = HostingEnvironment.MapPath("~/region.json");
                    string pluginsFolderPath = HostingEnvironment.MapPath("~/plugins");
                    string appDataFolderPath = HostingEnvironment.MapPath("~/App_Data");
                    if (!File.Exists(configFilePath))
                    {
                        throw new FileNotFoundException("Site configuration file not found: " + configFilePath);
                    }
                    if (!Directory.Exists(pluginsFolderPath))
                    {
                        throw new FileNotFoundException("Plugins folder not found: " + pluginsFolderPath);
                    }
                    if (!Directory.Exists(appDataFolderPath))
                    {
                        throw new FileNotFoundException("App_Data folder not found: " + appDataFolderPath);
                    }
                    geositeData = Geosite.LoadSiteData(configFilePath, pluginsFolderPath, appDataFolderPath);
                    geositeData.GeositeFrameworkVersion = geositeFrameworkVersion;
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

            // Configure log4net from the info in Web.config
            log4net.Config.XmlConfigurator.Configure();
        }
    }
}