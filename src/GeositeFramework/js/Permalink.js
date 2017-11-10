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
            'change .embed-size.height': function () { this.updateSize('height'); },
            'click .show-long-permalink': 'toggleLongPermalink'
        },

        render: function () {
            var view = this;

            TINY.box.show({
                boxid: 'permalink-tiny-box-modal',
                html: this.template(view.model.toJSON()),
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

                    var $domElement = view.$('.permalink-textbox');
                    view.selectText($domElement);

                    $domElement.mouseup(
                        function() {
                            view.selectText($domElement);
                        }
                    );

                    if ($.i18n) {
                        // Localize dialog, including the header which isn't a
                        // part of this view.
                        $(view.$el.parents('.popover')).localize();
                    }
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
        },

        toggleLongPermalink: function() {
            var $textbox = this.$el.find('#long-permalink-textbox');
            $textbox.toggle();
            this.selectText($textbox)
        },

        // Fancy DOM work to support iOS device "full text"
        // selection in the permalink box
        selectText: function($dom) {
            var el;
            if ($dom.length) {
                el = $dom[0];
            } else {
                return;
            }

            // iOS devices need setSelectionRange, IE does not have the method
            el.focus();
            if (el.setSelectionRange) {
                el.setSelectionRange(0, 99999);
            } else {
                $dom.select();
            }
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