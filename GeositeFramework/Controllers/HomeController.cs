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
            return View(app.GeositeData);
        }

    }
}
