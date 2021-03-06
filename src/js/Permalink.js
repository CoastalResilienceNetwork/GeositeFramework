﻿(function(N) {
    "use strict";

    N.models.Permalink = Backbone.Model.extend({
        defaults: {
            height: 400,
            width: 500,
            hash: null,
            url: null,
            shortUrl: null,
            mailLink: null,
            twitterLink: null
        },

        initialize: function () {
            // Sometimes location.href will have a trailing #, sometimes it
            // won't. This makes sure to always append when missing.
            var cleanHref = document.location.href;
            if (cleanHref.slice(-1) !== "#") { cleanHref += "#"; }

            this.set('url', cleanHref + this.get('hash'));
        },

        shorten: function() {
            var model = this;
			if (isProd) {
				
				var apiKey = "48598fa6dd3e4237b18dd6344b77a049";
				var requestHeaders = {
					"Content-Type": "application/json",
					"apikey": apiKey
				};
				
				var linkRequest = {
					destination: model.get('url')
				};
				
				$.ajax({
					url: 'https://api.rebrandly.com/v1/links',
					type: "post",
					data: JSON.stringify(linkRequest),
					headers: requestHeaders,
					dataType: "json",
					success: function(result){
						var shortUrl = (result.shortUrl.indexOf('http') == -1) ? 'https://' + result.shortUrl : result.shortUrl;
                        model.set('shortUrl', shortUrl);
                        model.genSocialLinks();
					},
					error: function(error) {
                        model.set('shortUrl', model.get('url')); 
                        model.genSocialLinks();
					}
				});
			} else {
                model.set('shortUrl', model.get('url'));
                model.genSocialLinks(); 
			}
        },

        toTitleCase: function(str) {
            return str.replace(/\w\S*/g, function(txt){
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });
        },

        genSocialLinks: function() {
            let shareText = "Check out my custom map from the " + N.app.data.region.titleMain.text;
            if(N.app.singlePluginMode) {
                shareText = shareText + " - " + this.toTitleCase(N.app.data.region.singlePluginMode.pluginFolderName.replace(/_/g, " ").replace(/-/g, " ")) + " App";
            }
            this.set('twitterLink', encodeURI(shareText));
            this.set('mailLink', encodeURI("mailto:?subject=See the map I made on " + N.app.data.region.titleMain.text + "&body=" + shareText + ": " + this.get('shortUrl')));
        },
            
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
            'click .show-long-permalink': 'toggleLongPermalink',
            'click .copy-to-clipboard': 'copyLinkToClipboard'
        },

        render: function () {
            var view = this;
            $.featherlight
            TINY.box.show({
                boxid: 'permalink-tiny-box-modal',
                html: this.template(view.model.toJSON()),
                fixed: true,
                openjs: function () {
                    view.setElement($('#permalink-dialog'));

                    if(!N.app.singlePluginMode) {
                        // Embed code will be re-rendered with UI changes
                        // so it is removed to its own view
                        view.embedView = new N.views.EmbedCode({
                            el: view.$('#iframe-embed'),
                            model: view.model
                        });
                        view.embedView.render();
                    } else {
                        view.socialView = new N.views.SocialShare({
                            el: view.$('#social-share'),
                            model: view.model
                        });
                        view.socialView.render();
                    }

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
                    if(!N.app.singlePluginMode) {
                        view.embedView.remove();
                    }
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

        copyLinkToClipboard: function() {
            /* Get the text field */
            var copyText = this.$el.find(".permalink-textbox");

            /* Select the text field */
            copyText.select();

            /* Copy the text inside the text field */
            document.execCommand("copy");

            var copyMessage = this.$el.find(".copy-success");
            copyMessage.show();
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

    N.views.SocialShare = Backbone.View.extend({
        template: null,

        initialize: function () {
            this.template = N.app.templates['social-share'];
        },

        render: function () {
            this.$el.empty().html(
                $.trim(this.template(this.model.toJSON()))
            );
        }
    });

}(Geosite));
