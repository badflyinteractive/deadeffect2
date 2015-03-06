// Application

var core = (function () {
    var moduleInitRegistry = [];
    
    function init() {
        setup();
    }

    function setup() {
        initModules();
    }

    function register(initFunction) {
        moduleInitRegistry.push(initFunction);
    }

    function initModules(settings) {
        while (moduleInitRegistry.length !== 0) {
            moduleInitRegistry.shift()();
        }
    }

    return {
        init: init,
        register: register
    };
})();


// Core Modules

core.ajax = (function () {
    function init(settings) {
    }

    function post(request) {
        request.type = 'POST';
        return ajax(request);
    }

    function get(request) {
        request.type = 'GET';
        return ajax(request);
    }

    function ajax(request) {
        if (typeof request.async === "undefined") {
            request.async = true;
        }

        return $.ajax({
            type: request.type,
            cache: false,
            url: request.url,
            data: request.data,
            dataType: "json",
            async: request.async,
            beforeSend: function (xhr, settings) {
                return beforeSendHandler(request, xhr);
            }
        }).done(function (data, textStatus, jqxhr) {
            successHandler(request, data);
        }).fail(function (data, text, err) {
            exceptionHandler(request, data, text, err);
        }).always(function (xhr, status) {
            completeHandler(request, xhr, status);
        });
    }

    function beforeSendHandler() {
        return true;
    }

    function successHandler(request, data) {
        if (data === null) {
            return;
        }

        // Handle Validation Errors
        if (data.Errors !== null && data.Errors.length > 0 && request.type.toUpperCase() === 'POST') {
            if (jQuery.isFunction(request.error)) {
                request.error(data.Json);
            }
            return;
        }

        if (jQuery.isFunction(request.success)) {
            request.success(data.Json);
        }
    }

    function exceptionHandler() {
        // TODO ajax exception handling
    }

    function completeHandler(request, xhr, status) {
        if (jQuery.isFunction(request.complete)) {
            request.complete(xhr, status);
        }
    }

    core.register(init);

    return {
        get: get,
        post: post
    };
})();


// Validation module
core.validation = (function () {
    // TODO: cache validators
    function init() {
        listeners();
    }

    function listeners() {
        $("form").on("change", "[data-val=true]", validate);
        $(document.body).on("submit", "form", submit);
    }

    function submit(e) {
        var $form = $(this);

        if (!validateForm($form)) {
            e.preventDefault();
        } else {
            if ($form.data("ajax")) {
                e.preventDefault();
                core.ajax.post({
                    url: $form.prop("action"),
                    type: $form.prop("method") || "GET",
                    data: $form.serializeArray(),
                    success: core.modals.success,
                    error: core.modals.error
                });
            }
        }
    }

    function validateForm($form) {
        var isValid = true;

        $form.find("[data-val=true]").each(function () {
            if (!validate.call(this)) {
                isValid = false;
            }
        });

        return isValid;
    }

    function validate() {
        var $this = $(this);

        var reqMsg = $this.data("val-required");
        var regexMsg = $this.data("val-regex");

        var reqValid = required($this, reqMsg);
        var regValid = regex($this, regexMsg, $this.data("val-regex-pattern"));

        return (reqValid && regValid);
    }

    function showError(valid, $el, msg) {
        var validator = $("#" + $el.prop("id") + "-validator");
        if (valid) {
            validator.text("").addClass("valid").removeClass("error");
        } else {
            validator.text(msg).addClass("error").removeClass("valid");
        }
    }

    // validators

    // TODO: refactor same code on both validators
    function required($el, msg) {
        var valid = true;
        if (!isNullOrEmpty(msg)) {
            valid = !isNullOrEmpty($.trim($el.val()));
            showError(valid, $el, msg);
        }

        return valid;
    }

    function regex($el, msg, pattern) {
        var valid = true,
            regex = new RegExp(pattern, "i");
        if (!isNullOrEmpty(msg)) {
            valid = (regex.test($.trim($el.val())));
            showError(valid, $el, msg);
        }

        return valid;
    }

    // helpers
    function isNullOrEmpty(val) {
        return (typeof val === "undefined" || val === null || val === "");
    }

    core.register(init);

    return {};
})();


// UI Modules

// Gallery module

core.modals = (function () {
    function init() {
        listeners();
    }

    function listeners() {
        $(".fancybox a").fancybox({
            padding: 1,
            helpers: {
                media: true,
                title: {
                    type: 'inside'
                }
            }
        });
        $(".fancybox a[data-play=1]").trigger('click');

        $('.modal-open').fancybox({
            beforeLoad: function () {
                $(".modal-error").hide();
                $(".modal-valid").hide();
            }
        });
    }

    function formSuccess(json) {
        $(".modal-error").hide();
        $(".modal-valid").show();

        setTimeout(function () {
            $.fancybox.close();
        }, 10000);
    }

    function formError(json) {
        $(".modal-error").show();
        $(".modal-valid").hide();
    }

    core.register(init);

    return {
        success: formSuccess,
        error: formError
    };
})();


// PC page - YT Player Module
// TODO: add origin to iframe src
(function () {
    var config;

    function init() {
        config = {
            playerId: "ytplayer",
            ctrlMuteSelector: "#js-ctrl-mute"
        };

        setup();
    }

    function setup() {
        embedScript();
        listeners();
    }

    function listeners() {
        $("body").on("click", config.ctrlMuteSelector, toggleMute);
    }

    function toggleMute() {
        var $icon = $(this).find('i');
        if (config.player.isMuted()) {
            config.player.unMute();
            $icon.addClass('icon-mute').removeClass('icon-unmute');
        } else {
            config.player.mute();
            $icon.addClass('icon-unmute').removeClass('icon-mute');
        }
    }

    function setupPlayer() {
        config.player = new YT.Player(config.playerId, {
            events: {
                'onReady': function (e) {
                    e.target.setVolume(30);
                    //e.target.mute();
                }
            }
        });

        $(config.ctrlMuteSelector).show();
    }

    function embedScript() {
        if ($('#' + config.playerId).length) {

            // youtube js api iframe callback
            window.onYouTubeIframeAPIReady = function () {
                setupPlayer();
            };

            // embed yt api js
            var tag = document.createElement('script');
            tag.src = "https://www.youtube.com/player_api";
            var firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
    }

    core.register(init);
})();

// TODO: merge with the yt module above
(function () {
    // Find all YouTube videos
	var $allVideos = $("iframe[src^='http://www.youtube.com']"),
        $fluidEl = $("#body"),
        aspectRatioName = 'aspectRatio';

	// Figure out and save aspect ratio for each video
	$allVideos.each(function() {
		$(this).data(aspectRatioName, this.height / this.width).removeAttr('height').removeAttr('width');
	});

	// on window resize
	// (You'll probably want to debounce this)
	$(window).resize(function() {

        // border hence -2
		var newWidth = $fluidEl.width() - 2;
		
		// Resize all videos according to their own aspect ratio
		$allVideos.each(function() {
			var $el = $(this);
			$el.width(newWidth).height(newWidth * $el.data(aspectRatioName));
		});
    // Kick off one resize to fix all videos on page load
	}).resize();
})(); 

core.ui = (function () {
    function init() {
        setupStore();
        listeners();
    }

    function listeners() {
        //var audio = new Audio();
        //audio.addEventListener('canplaythrough', isAppLoaded, false);

        $(document.body)
            .on("click", "[data-m-to]", email)
            .on("click", "a[target=_blank]", trackExit)
            .on("submit", "form[target=_blank]", trackForm)
            .on("click", "button.collapsed", trackExpand);
    }

    function setupStore() {
        if (typeof $.selz !== "undefined") {
            $.selz({
                buttonBg: "#0a4083",
                buttonText: "#fff",
                prefetch: true,
                onDataReady: function ($link, data) {
                    if($link.hasClass('store')){
                        ga(function(tracker) {
                            var linkerParam = tracker.get('linkerParam');
                            $link.data('modal-url', data.Url + "&" + linkerParam);
                        });
                        $link.html('<img src="' + data.ImageUrlSmall + '" alt="' + data.Title + '">' + data.Title);    
                    }
                },
                onModalOpen: function ($link) {
                    trackStoreItemClick.call($link);
                }
            });
        }
    }

    function trackExpand() {
        track('expand: ' + $(this).data("target").replace(".", ""), 'expand', window.location.href);
    }

    function trackForm() {
        var category = "exit",
            $form = $(this),
            url = $form.attr("action");

        if (url.indexOf('paypal.com') !== -1) {
            category = category + ': paypal';
        }

        track(category, 'submit', url);
    }

    function trackStoreItemClick() {
        track('goodies', 'click', $(this).attr("href"));
    }

    function trackExit() {
        track('exit', 'click', $(this).attr("href"));
    }

    function track(category, action, url) {
        if(typeof ga !== "undefined" && $.isFunction(ga)){
            ga('send', 'event', category, url, action);    
        }
    }

    function email() {
        $this = $(this);
        window.location = "mailto:" + $this.data("m-to") + "@" + $this.data("m-s");
        return false;
    }

    core.register(init);
})();

// run immediately
!function ($) {
    var second = 1000;
    var dd_utc_ms;
    var diff_ms;

    function init() {
        listeners();
    }

    function listeners() {
        $(".countdown").each(left);
    }

    function left(i, el) {
        var $el = $(el),
            dd_utc = $el.data("time-utc"),
            left_ms = $el.data("time-left"),
            $days = $el.find(".days"),
            $hours = $el.find(".hours"),
            $minutes = $el.find(".minutes"),
            $seconds = $el.find(".seconds");

        var now_client = new Date();
        var now_local_ms = now_client.getTime();
        var dd_local_ms = (now_local_ms + left_ms);

        var interval = setInterval(function () {
            var left = dd_local_ms - new Date().getTime();
            
            if (left <= 1) {
                clearInterval(interval);
                location.reload(true);
            } else {
                var remainig = dhms(left);
                $days.text(remainig.d);
                $hours.text(remainig.h);
                $minutes.text(remainig.m);
                $seconds.text(remainig.s);
            }
        }, second);
    }

    function dhms(t) {
        var cm = 60 * second, // minute in ms
            ch = 60 * cm,   // hour in ms
            cd = 24 * ch,   // day in ms
            d = Math.floor(t / cd),
            h = Math.floor((t - d * cd) / ch),
            m = Math.floor((t - d * cd - h * ch) / cm),
            s = Math.floor((t - d * cd - h * ch - m * cm) / second);

        return {
            d: d,
            h: ('0' + h).substr(-2),
            m: ('0' + m).substr(-2),
            s: ('0' + s).substr(-2)
        };
    }

    init();

} (window.jQuery);

// Initialise application
$(function () {
    core.init();
});


/* Plugins */
/* =============================================================
 * bootstrap-collapse.js v2.3.1
 * http://twitter.github.com/bootstrap/javascript.html#collapse
 * =============================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ============================================================ */


!function ($) {
    /* COLLAPSE PUBLIC CLASS DEFINITION
     * ================================ */

    var Collapse = function (element, options) {
        this.$element = $(element)
        this.options = $.extend({}, $.fn.collapse.defaults, options)

        if (this.options.parent) {
            this.$parent = $(this.options.parent)
        }

        this.options.toggle && this.toggle()
    }

    Collapse.prototype = {

        constructor: Collapse

    , dimension: function () {
        var hasWidth = this.$element.hasClass('width')
        return hasWidth ? 'width' : 'height'
    }

    , show: function () {
        var dimension
          , scroll
          , actives
          , hasData

        if (this.transitioning || this.$element.hasClass('in')) return

        dimension = this.dimension()
        scroll = $.camelCase(['scroll', dimension].join('-'))
        actives = this.$parent && this.$parent.find('> .accordion-group > .in')

        if (actives && actives.length) {
            hasData = actives.data('collapse')
            if (hasData && hasData.transitioning) return
            actives.collapse('hide')
            hasData || actives.data('collapse', null)
        }

        this.$element[dimension](0)
        this.transition('addClass', $.Event('show'), 'shown')
        $.support.transition && this.$element[dimension](this.$element[0][scroll])
    }

    , hide: function () {
        var dimension
        if (this.transitioning || !this.$element.hasClass('in')) return
        dimension = this.dimension()
        this.reset(this.$element[dimension]())
        this.transition('removeClass', $.Event('hide'), 'hidden')
        this.$element[dimension](0)
    }

    , reset: function (size) {
        var dimension = this.dimension()

        this.$element
          .removeClass('collapse')
          [dimension](size || 'auto')
          [0].offsetWidth

        this.$element[size !== null ? 'addClass' : 'removeClass']('collapse')

        return this
    }

    , transition: function (method, startEvent, completeEvent) {
        var that = this
          , complete = function () {
              if (startEvent.type == 'show') that.reset()
              that.transitioning = 0
              that.$element.trigger(completeEvent)
          }

        this.$element.trigger(startEvent)

        if (startEvent.isDefaultPrevented()) return

        this.transitioning = 1

        this.$element[method]('in')

        $.support.transition && this.$element.hasClass('collapse') ?
          this.$element.one($.support.transition.end, complete) :
          complete()
    }

    , toggle: function () {
        this[this.$element.hasClass('in') ? 'hide' : 'show']()
    }

    }


    /* COLLAPSE PLUGIN DEFINITION
     * ========================== */

    var old = $.fn.collapse

    $.fn.collapse = function (option) {
        return this.each(function () {
            var $this = $(this)
              , data = $this.data('collapse')
              , options = $.extend({}, $.fn.collapse.defaults, $this.data(), typeof option == 'object' && option)
            if (!data) $this.data('collapse', (data = new Collapse(this, options)))
            if (typeof option == 'string') data[option]()
        })
    }

    $.fn.collapse.defaults = {
        toggle: true
    }

    $.fn.collapse.Constructor = Collapse


    /* COLLAPSE NO CONFLICT
     * ==================== */

    $.fn.collapse.noConflict = function () {
        $.fn.collapse = old
        return this
    }


    /* COLLAPSE DATA-API
     * ================= */

    $(document).on('click.collapse.data-api', '[data-toggle=collapse]', function (e) {
        var $this = $(this), href
          , target = $this.attr('data-target')
            || e.preventDefault()
            || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '') //strip for ie7
          , option = $(target).data('collapse') ? 'toggle' : $this.data()
        $this[$(target).hasClass('in') ? 'addClass' : 'removeClass']('collapsed')
        $(target).collapse(option)
    })

}(window.jQuery);