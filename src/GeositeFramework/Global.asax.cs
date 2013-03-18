using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web.Hosting;
using System.Web.Http;
using System.Web.Mvc;
using System.Web.Routing;
using GeositeFramework.Helpers;
using GeositeFramework.Models;
using log4net;
using log4net.Appender;
using log4net.Layout;
using log4net.Repository.Hierarchy;

namespace GeositeFramework
{
    public class MvcApplication : System.Web.HttpApplication
    {
        public static Geosite GeositeData { get; private set; }

        private static readonly string _geositeFrameworkVersion = "1.0.0";
        private static readonly ILog _log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        protected void Application_Start()
        {
            AreaRegistration.RegisterAllAreas();

            WebApiConfig.Register(GlobalConfiguration.Configuration);
            FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
            RouteConfig.RegisterRoutes(RouteTable.Routes);

            // Configure log4net from the info in Web.config
            log4net.Config.XmlConfigurator.Configure();
            _log.Info("Initializing GeositeFramework, version " + _geositeFrameworkVersion);

            // Load geosite configuration data (which loads and validates all config files)
            GeositeData = LoadGeositeData();
            
            // Create a logger for each plugin
            foreach (string pluginName in GeositeData.PluginFolderNames)
            {
                CreateLogger(pluginName);
            }
        }

        private Geosite LoadGeositeData()
        {
            // Load geosite data from "region.json" file
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
            try
            {
                var geositeData = Geosite.LoadSiteData(configFilePath, pluginsFolderPath, appDataFolderPath);
                geositeData.GeositeFrameworkVersion = _geositeFrameworkVersion;
                return geositeData;
            }
            catch (JsonValidationException ex)
            {
                _log.Error(ex.Message);
                foreach (var message in ex.ParseMessages)
                {
                    _log.Error(message);
                }
                throw;   // Will display /Error.html
            }
            catch (Exception ex)
            {
                _log.Error(ex.Message);
                throw;   // Will display /Error.html
            }
        }

        private void CreateLogger(string loggerName)
        {
            var hierarchy = (Hierarchy)LogManager.GetRepository();
            var logger = (Logger)hierarchy.GetLogger(loggerName);
            if (logger.Appenders.Count == 0)
            {
                var fileAppender = new RollingFileAppender();
                fileAppender.File = Path.Combine(@".\logs", loggerName + ".log");
                fileAppender.Layout = new PatternLayout("%date %-5level - %message%newline");
                fileAppender.ImmediateFlush = true;
                fileAppender.RollingStyle = RollingFileAppender.RollingMode.Size;
                fileAppender.MaximumFileSize = "10MB";
                fileAppender.AppendToFile = true;
                fileAppender.MaxSizeRollBackups = 10;
                fileAppender.ActivateOptions();

                logger.Additivity = false; // don't also log to root logger
                logger.AddAppender(fileAppender);
            }
        }

    }
}