using System;
using System.Collections.Generic;
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
                    string path = HostingEnvironment.MapPath("~/App_Data/geosite.json");
                    geositeData = Geosite.LoadFromJson(path);
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