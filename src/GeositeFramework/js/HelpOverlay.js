(function(N) {

    N.controllers.HelpOverlay = function(options) {
        this.defaults = _.extend({
            'openButtonSelector': '#help-overlay-start'
        });
        
        tl.pg.init({
            'custom_open_button': this.defaults.openButtonSelector
        });

    };

}(Geosite));