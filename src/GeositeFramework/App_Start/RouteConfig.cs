using System.Web.Mvc;
using System.Web.Routing;

namespace GeositeFramework
{
    public class RouteConfig
    {
        public static void RegisterRoutes(RouteCollection routes)
        {
            routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

            routes.MapRoute(
                name: "Csv",
                url: "download/csv",
                constraints: new { httpMethod = new HttpMethodConstraint("POST") },
                defaults: new { controller = "Download", action = "csv" }
            );

            routes.MapRoute(
                name: "Text",
                url: "download/text",
                constraints: new { httpMethod = new HttpMethodConstraint("POST") },
                defaults: new { controller = "Download", action = "text" }
            );

            routes.MapRoute(
                name: "Default",
                url: "{controller}/{action}/{id}",
                defaults: new { controller = "Home", action = "Index", id = UrlParameter.Optional }
            );

        }
    }
}