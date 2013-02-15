/*global Backbone, _, Geosite, $*/

(function (N) {
    'use strict';
    /* 

        Pre-compile all of the templates stored in 
        <script type="text/template">...</script> tags.  Store
        the compiled template functions in the data structure passed
        in as an option.

     */
    N.TemplateLoader = function TemplateLoader() {
        this.load = function TemplateLoaderLoad(store) {
            $("script[type='text/template']").each(function () {
                var id = $(this).attr('id'),
                    html = $(this).html();
                if (store[id]) {
                    throw ("Duplicate template name: " + id);
                } else {
                    store[id] = _.template(html);
                }
            });
        };
    };

}(Geosite));