// SasNotch site: device check, copy/email link, menu, videos, the island demo, gentle parallax.
// No tracking, no cookies, no storage.
(function () {
  "use strict";

  var SITE = "https://sasnotch.vercel.app/";
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Mac or not? ---------- */

  // Returns a friendly device name for non-Mac visitors, or null on a Mac.
  // ?device=windows (or iphone, android...) forces it, for testing.
  function otherDevice() {
    var forced = new URLSearchParams(location.search).get("device");
    if (forced) {
      var names = { iphone: "an iPhone", ipad: "an iPad", android: "an Android device", windows: "a Windows PC", linux: "a Linux computer", chromebook: "a Chromebook" };
      return forced === "mac" ? null : names[forced.toLowerCase()] || "another device";
    }
    var ua = navigator.userAgent || "";
    var platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
    if (/iPhone|iPod/.test(ua)) return "an iPhone";
    if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "an iPad";
    if (/Android/i.test(ua)) return "an Android device";
    if (/CrOS/.test(ua)) return "a Chromebook";
    if (/Windows/i.test(ua) || /^Win/i.test(platform)) return "a Windows PC";
    if (/Linux/i.test(ua) || /Linux/i.test(platform)) return "a Linux computer";
    return null;
  }

  var device = otherDevice();
  if (device) {
    root.classList.add("is-other");
    document.querySelectorAll("[data-device]").forEach(function (el) { el.textContent = device; });
  }

  /* ---------- Copy and email the link ---------- */

  var pageUrl = /^https?:$/.test(location.protocol) ? location.origin + "/" : SITE;
  var toast = document.querySelector("[data-toast]");
  var toastText = document.querySelector("[data-toast-text]");
  var toastLink = document.querySelector("[data-toast-link]");
  var toastTimer;

  // withLink shows the "Watch the 45s guide" link and keeps the toast up longer.
  function showToast(message, withLink) {
    if (!toast) return;
    toastText.textContent = message;
    toastLink.hidden = !withLink;
    toast.classList.add("is-shown");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, withLink ? 9000 : 2600);
  }
  function hideToast() { toast.classList.remove("is-shown"); }
  if (toast) {
    // Hovering or focusing the link keeps the toast from vanishing under the pointer.
    toast.addEventListener("pointerenter", function () { clearTimeout(toastTimer); });
    toast.addEventListener("pointerleave", function () { toastTimer = setTimeout(hideToast, 2500); });
    toastLink.addEventListener("focus", function () { clearTimeout(toastTimer); });
  }

  // After a Mac download starts, offer the install video.
  document.querySelectorAll("[data-download]").forEach(function (link) {
    link.addEventListener("click", function () {
      showToast("Downloading… Need help installing?", true);
    });
  });

  function copyFallback(text) {
    var field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    field.remove();
    return ok;
  }

  document.querySelectorAll("[data-copy]").forEach(function (button) {
    button.addEventListener("click", function () {
      var done = function () { showToast("Link copied. Open it on your Mac."); };
      var failed = function () { showToast(copyFallback(pageUrl) ? "Link copied. Open it on your Mac." : pageUrl); };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(pageUrl).then(done, failed);
      } else {
        failed();
      }
    });
  });

  document.querySelectorAll("[data-email]").forEach(function (link) {
    link.href = "mailto:?subject=" + encodeURIComponent("SasNotch for my Mac") +
      "&body=" + encodeURIComponent("Download SasNotch on my Mac: " + pageUrl);
  });

  /* ---------- Menu on small screens ---------- */

  var nav = document.querySelector(".nav");
  var menuButton = document.querySelector("[data-menu]");
  if (nav && menuButton) {
    var setMenu = function (open) {
      nav.classList.toggle("is-open", open);
      menuButton.setAttribute("aria-expanded", String(open));
    };
    menuButton.addEventListener("click", function () { setMenu(!nav.classList.contains("is-open")); });
    nav.querySelectorAll(".nav-links a").forEach(function (link) {
      link.addEventListener("click", function () { setMenu(false); });
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("is-open")) { setMenu(false); menuButton.focus(); }
    });
    document.addEventListener("click", function (event) {
      if (nav.classList.contains("is-open") && !nav.contains(event.target)) setMenu(false);
    });
  }

  /* ---------- Videos ---------- */

  var videos = {
    promo: document.getElementById("promo-video"),
    install: document.getElementById("install-video"),
    learn: document.getElementById("learn-video"),
    tour: document.getElementById("tour-video")
  };
  var allVideos = Object.keys(videos).map(function (key) { return videos[key]; }).filter(Boolean);

  // Posters load only when a video gets near the screen.
  var setPoster = function (video) {
    if (video.dataset.poster && !video.getAttribute("poster")) video.setAttribute("poster", video.dataset.poster);
  };
  if ("IntersectionObserver" in window) {
    var posterWatch = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { setPoster(entry.target); posterWatch.unobserve(entry.target); }
      });
    }, { rootMargin: "200px 0px" });
    allVideos.forEach(function (video) { if (video !== videos.tour) posterWatch.observe(video); });
  } else {
    allVideos.forEach(setPoster);
  }

  // Only one video plays at a time.
  allVideos.forEach(function (video) {
    video.addEventListener("play", function () {
      allVideos.forEach(function (other) { if (other !== video && !other.paused) other.pause(); });
    });
  });

  // The shared helper: optionally scroll a video into view, jump to a time and play.
  // play() runs straight away, inside the click, so browsers allow sound; the seek
  // happens as soon as the video knows its length.
  function seekAndPlay(video, seconds, options) {
    if (!video) return;
    options = options || {};
    setPoster(video);
    if (options.scroll !== false) {
      var frame = video.closest(".video-frame") || video;
      frame.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "center" });
    }
    var seek = function () {
      if (Math.abs(video.currentTime - seconds) > 0.25) video.currentTime = seconds;
    };
    if (video.readyState >= 1) seek(); else video.addEventListener("loadedmetadata", seek, { once: true });
    if (options.play === false) {
      if (video.readyState < 1) { video.preload = "metadata"; video.load(); }
      return;
    }
    var playing = video.play();
    if (playing && playing.catch) playing.catch(function () {});
  }

  // Links like #install-0:17 or #learn-0:20.
  var parseJump = function (hash) {
    var match = /^#(promo|install|learn)-(\d+):(\d{2})$/.exec(hash || "");
    return match ? { video: videos[match[1]], seconds: Number(match[2]) * 60 + Number(match[3]) } : null;
  };
  document.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest('a[href^="#"]');
    if (!link) return;
    var jump = parseJump(link.getAttribute("href"));
    if (!jump || !jump.video) return;
    event.preventDefault();
    if (link.hasAttribute("data-toast-link")) hideToast();
    history.replaceState(null, "", link.getAttribute("href"));
    seekAndPlay(jump.video, jump.seconds);
  });
  // Arriving with such a link scrolls and cues the video, without starting sound unasked.
  var arrival = parseJump(location.hash);
  if (arrival && arrival.video) {
    window.addEventListener("load", function () { seekAndPlay(arrival.video, arrival.seconds, { play: false }); });
  }

  // Chapter buttons, and the active chapter following playback.
  var chapterGroups = {};
  document.querySelectorAll(".chapter[data-video]").forEach(function (button) {
    var key = button.dataset.video;
    (chapterGroups[key] = chapterGroups[key] || []).push(button);
    button.addEventListener("click", function () {
      seekAndPlay(videos[key], Number(button.dataset.t), { scroll: false });
    });
  });
  Object.keys(chapterGroups).forEach(function (key) {
    var video = videos[key];
    var buttons = chapterGroups[key];
    if (!video) return;
    var mark = function () {
      var active = null;
      buttons.forEach(function (button) { if (video.currentTime + 0.3 >= Number(button.dataset.t)) active = button; });
      buttons.forEach(function (button) {
        if (button === active) button.setAttribute("aria-current", "true"); else button.removeAttribute("aria-current");
      });
    };
    video.addEventListener("timeupdate", mark);
    video.addEventListener("seeked", mark);
  });

  // The tour modal: native <dialog> keeps the page behind it inert; Tab stays inside.
  var modal = document.getElementById("tour-modal");
  var opener = null;
  if (modal && modal.showModal) {
    var closeModal = function () { if (modal.open) modal.close(); };
    document.querySelectorAll("[data-tour]").forEach(function (button) {
      button.addEventListener("click", function () {
        opener = button;
        modal.showModal();
        modal.querySelector("[data-close]").focus();
        seekAndPlay(videos.tour, 0, { scroll: false });
      });
    });
    modal.querySelector("[data-close]").addEventListener("click", closeModal);
    modal.addEventListener("click", function (event) { if (event.target === modal) closeModal(); });
    modal.addEventListener("cancel", function () { videos.tour.pause(); });
    modal.addEventListener("close", function () {
      videos.tour.pause();
      if (opener) opener.focus();
    });
    modal.addEventListener("keydown", function (event) {
      if (event.key !== "Tab") return;
      var focusables = [modal.querySelector("[data-close]"), videos.tour];
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  } else if (modal) {
    // Very old browsers: send the tour button to the inline video instead.
    document.querySelectorAll("[data-tour]").forEach(function (button) {
      button.addEventListener("click", function () { seekAndPlay(videos.promo, 0); });
    });
  }

  /* ---------- The island demo ---------- */

  var island = document.getElementById("island");
  if (island) {
    var panes = island.querySelectorAll(".pane");
    var dots = island.querySelectorAll(".dots i");
    var count = island.querySelector(".timer-count");
    var ring = island.querySelector(".ring-fill");
    var current = 0;
    var cycleTimer = null;
    var closeTimer = null;
    var tickTimer = null;
    var openedAt = 0;
    var hovering = false;
    var seconds = 222;
    var RING = 113.1;
    var TOTAL = 300;

    var show = function (index) {
      current = (index + panes.length) % panes.length;
      panes.forEach(function (pane, i) { pane.classList.toggle("is-active", i === current); });
      dots.forEach(function (dot, i) { dot.classList.toggle("is-active", i === current); });
    };

    var tick = function () {
      seconds = seconds > 1 ? seconds - 1 : TOTAL;
      count.textContent = Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
      ring.style.strokeDashoffset = String(RING * (1 - seconds / TOTAL));
    };

    var startCycle = function (onDone) {
      stopCycle();
      if (reduceMotion.matches) return;
      var steps = 0;
      cycleTimer = setInterval(function () {
        steps += 1;
        if (onDone && steps >= panes.length) { stopCycle(); onDone(); return; }
        show(current + 1);
      }, 3200);
    };
    var stopCycle = function () { clearInterval(cycleTimer); cycleTimer = null; };

    var open = function () {
      clearTimeout(closeTimer);
      if (island.classList.contains("is-open")) return;
      island.classList.add("is-open");
      island.setAttribute("aria-expanded", "true");
      openedAt = Date.now();
      if (!tickTimer) tickTimer = setInterval(tick, 1000);
    };
    var close = function () {
      island.classList.remove("is-open");
      island.setAttribute("aria-expanded", "false");
      stopCycle();
      clearInterval(tickTimer);
      tickTimer = null;
    };
    var closeSoon = function (delay) {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(function () {
        if (!hovering && document.activeElement !== island) close();
      }, delay);
    };

    ring.style.strokeDashoffset = String(RING * (1 - seconds / TOTAL));

    // Say hello on load: open, walk through the three panes, then tuck back in.
    setTimeout(function () {
      open();
      if (reduceMotion.matches) { closeSoon(6000); return; }
      startCycle(function () { show(0); closeSoon(400); });
    }, 700);

    island.addEventListener("pointerenter", function (event) {
      if (event.pointerType === "touch") return;
      hovering = true;
      open();
      if (!cycleTimer) startCycle();
    });
    island.addEventListener("pointerleave", function (event) {
      if (event.pointerType === "touch") return;
      hovering = false;
      closeSoon(700);
    });
    island.addEventListener("focus", function () { open(); });
    island.addEventListener("blur", function () { closeSoon(300); });
    island.addEventListener("click", function () {
      if (!island.classList.contains("is-open")) {
        open();
        startCycle();
        return;
      }
      // A click right after a hover-open shouldn't skip the first pane.
      if (Date.now() - openedAt < 350) return;
      show(current + 1);
      startCycle();
    });
    island.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { close(); }
    });
  }

  /* ---------- Gentle parallax in the hero ---------- */

  var layers = document.querySelectorAll(".scene [data-depth]");
  var hero = document.querySelector(".hero");
  var ticking = false;

  var paint = function () {
    ticking = false;
    var y = window.scrollY;
    if (y > hero.offsetHeight) return;
    layers.forEach(function (layer) {
      layer.style.transform = "translate3d(0," + (y * parseFloat(layer.dataset.depth)).toFixed(1) + "px,0)";
    });
  };
  var onScroll = function () {
    if (!ticking) { ticking = true; requestAnimationFrame(paint); }
  };
  var setParallax = function () {
    if (reduceMotion.matches || !hero) {
      window.removeEventListener("scroll", onScroll);
      layers.forEach(function (layer) { layer.style.transform = ""; });
    } else {
      window.addEventListener("scroll", onScroll, { passive: true });
      paint();
    }
  };
  setParallax();
  if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", setParallax);

  /* ---------- Footprints walk in when they scroll into view ---------- */

  var trail = document.querySelector(".trail");
  if (trail && "IntersectionObserver" in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { trail.classList.add("is-visible"); seen.disconnect(); }
      });
    }, { threshold: 0.6 });
    seen.observe(trail);
  }
})();
