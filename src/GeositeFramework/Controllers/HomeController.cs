using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace GeositeFramework.Controllers
{
    public class HomeController : Controller
    {
        //
        // GET: /Home/

        public ActionResult Index()
        {
            var app = HttpContext.ApplicationInstance as MvcApplication;
            try
            {
                return View(app.GeositeData);
            }
            catch (Exception)
            {
                // TODO: log exception using log4net
                // TODO: return a nice "500" error page
                throw;
            }
        }

    }
}
