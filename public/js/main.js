// SasNotch site: device check, copy/email link, the island demo, gentle parallax.
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
  var toastTimer;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-shown");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-shown"); }, 2600);
  }

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
