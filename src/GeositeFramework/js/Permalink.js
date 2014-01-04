(function(N) {
    "use strict";

    N.models.Permalink = Backbone.Model.extend({
        defaults: {
            height: 400,
            width: 500,
            hash: null,
            url: null,
            shortUrl: null
        },
        
        initialize: function () {
            // Sometimes location.href will have a trailing #, sometimes it
            // won't. This makes sure to always append when missing.
            var cleanHref = document.location.href;
            if (cleanHref.slice(-1) !== "#") { cleanHref += "#"; }

            this.set('url', cleanHref + this.get('hash'));
        },
        
        shorten: function() {
            var model = this,
                request = gapi.client.urlshortener.url.insert({
                    'resource': {
                        'longUrl': model.get('url')
                    }
                });

            request.execute(function (result) {
                if (result.error) {
                    Azavea.logError("Error in URL Shortener", result.error);
                    model.set('shortUrl', model.get('url'));
                } else {
                    model.set('shortUrl', result.id);
                }
            });
        }
    });

    N.views.Permalink = Backbone.View.extend({
        dialogTemplate: null,
        embedView: null,
        
        initialize: function () {
            this.template = N.app.templates['permalink-share-window'];
            this.model.on('change:height change:width', this.renderEmbedCode, this);
            this.model.on('change:shortUrl', this.render, this);
            this.model.shorten();
        },

        events: {
            'change .embed-size.width': function () { this.updateSize('width'); },
            'change .embed-size.height': function () { this.updateSize('height'); }
        },
        
        render: function () {
            // iOS devices need setSelectionRange, IE does not have the method
            function _doSelect($dom, el) {
                el.focus();
                if (el.setSelectionRange) {
                    el.setSelectionRange(0, 99999);
                } else {
                    $dom.select();
                }
            }

            var view = this;
            
            TINY.box.show({
                html: this.template(view.model.toJSON()),
                width: 500,
                height: 400,
                fixed: true,
                openjs: function () {
                    view.setElement($('#permalink-dialog'));

                    // Embed code will be re-rendered with UI changes
                    // so it is removed to its own view
                    view.embedView = new N.views.EmbedCode({
                        el: view.$('#iframe-embed'),
                        model: view.model
                    });
                    view.embedView.render();

                    // Fancy DOM work to support iOS device "full text"
                    // selection in the permalink box
                    var $domElement = view.$('.permalink-textbox'),
                        box = $domElement[0];
                    _doSelect($domElement, box);

                    $domElement.mouseup(
                        function() {
                            _doSelect($domElement, box);
                        }
                    );
                },
                closejs: function() {
                    view.remove();
                    view.embedView.remove();
                }
            });
        },

        renderEmbedCode: function() {
            this.embedView.render();
        },

        updateSize: function (key) {
            this.model.set(key, this.$('.' + key).val());
        }
    }); 

    N.views.EmbedCode = Backbone.View.extend({
        template: null,

        initialize: function () {
            this.template = N.app.templates['embed-iframe'];
        },

        render: function () {
            this.$el.empty().html(
                $.trim(this.template(this.model.toJSON()))
            );
        }
    });
    
}(Geosite));