/* ============================================================
   Social's Way — scroll engine + catalog rail
   Deterministic timeline: local scroll distance -> progress p
   -> a handful of CSS custom properties. CSS owns all motion.
   ============================================================ */
(() => {
  "use strict";

  /* ---------------- config ---------------- */
  const CONFIG = {
    // normalized timeline boundaries (see TIMELINE.md)
    timeline: {
      introOut:  [0.03, 0.15],   // title + standfirst leave
      open:      [0.12, 0.25],   // doors part + camera push
      panelA:    [0.20, 0.345],  // A envelope (in, hold, out)
      aHold:     [0.26, 0.30],
      panorama:  [0.37, 0.41],   // clean world hold
      panelB:    [0.41, 0.51],   // B envelope (the approach)
      bHold:     [0.45, 0.48],
      panelC:    [0.515, 0.605], // C envelope (design philosophy)
      cHold:     [0.55, 0.58],
      panelD:    [0.615, 0.66],  // D title card ("selected work" intro)
      dHold:     [0.625, 0.645],
      tintOn:    [0.41, 0.45],   // focus tint + blur across B, C, D
      tintOff:   [0.655, 0.70],
      workRail:  [0.68, 0.83],   // selected-work rail entrance
      workSettle:[0.80, 0.85],
      rail:      [0.84, 0.955],  // services catalog entrance (finale)
      settle:    [0.94, 0.98],   // controls + final state
    },
    worldScale: 1.14,            // camera push at full open
    blurMax: 5,                  // px, world defocus behind narrative B
    parallax: { bg: 6, mid: 12, hero: 20, door: 22 },  // px at extrema (CSS mirrors these)
    smooth: 0.085,               // playhead lerp per frame
    pointerSmooth: 0.06,
    workLiveAt: 0.72,            // p where the selected-work rail goes live
    catalogLiveAt: 0.90,         // p where the services rail goes live
    reducedTravelPx: 3400,       // min scroll length on small screens
  };

  /* ---------------- math helpers ---------------- */
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (t) => t * t * (3 - 2 * t);
  // progress within [a, b], clamped and eased
  const rangeProgress = (p, a, b) => smoothstep(clamp((p - a) / (b - a)));
  // envelope: 0 -> 1 across [in0,in1], hold, 1 -> 0 across [out0,out1]
  const segmentInOut = (p, in0, in1, out0, out1) =>
    rangeProgress(p, in0, in1) * (1 - rangeProgress(p, out0, out1));

  /* ---------------- dom ---------------- */
  const section = document.getElementById("cinematic");
  const stage = document.getElementById("stage");
  const catalog = document.getElementById("catalog");
  const workShowcase = document.getElementById("work-showcase");
  const panelA = document.querySelector(".copy-a");
  const panelB = document.querySelector(".copy-b");
  const panelC = document.querySelector(".copy-c");
  const panelD = document.querySelector(".copy-d");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarsePointer = window.matchMedia("(pointer: coarse)");

  /* ---------------- state ---------------- */
  const state = {
    target: 0,        // target progress from scroll
    p: 0,             // smoothed playhead
    mx: 0, my: 0,     // smoothed pointer
    tmx: 0, tmy: 0,   // target pointer
    maxScroll: 1,
    rafId: 0,
    running: false,
    stageVisible: true,
    isCatalogLive: false,
    isWorkLive: false,
  };

  /* ---------------- measurement ---------------- */
  function measure() {
    if (reduceMotion.matches) return;
    // scroll length adapts to viewport height so short laptops are not exhausting
    const base = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--scroll-length")
    ) || 4200;
    const wanted = Math.max(base, window.innerHeight * 4.2);
    const travel = Math.min(wanted, Math.max(CONFIG.reducedTravelPx, base));
    section.style.height = `${travel}px`;
    state.maxScroll = Math.max(1, travel - window.innerHeight);
    readScroll();
  }

  function readScroll() {
    if (reduceMotion.matches) return;
    const rect = section.getBoundingClientRect();
    const local = clamp(-rect.top, 0, state.maxScroll);
    state.target = local / state.maxScroll;
    requestFrame();
  }

  /* ---------------- render ---------------- */
  function render(p) {
    const t = CONFIG.timeline;

    const intro = 1 - rangeProgress(p, t.introOut[0], t.introOut[1]);
    const open = rangeProgress(p, t.open[0], t.open[1]);
    const aEnv = segmentInOut(p, t.panelA[0], t.aHold[0], t.aHold[1], t.panelA[1]);
    const bEnv = segmentInOut(p, t.panelB[0], t.bHold[0], t.bHold[1], t.panelB[1]);
    const cEnv = segmentInOut(p, t.panelC[0], t.cHold[0], t.cHold[1], t.panelC[1]);
    const dEnv = segmentInOut(p, t.panelD[0], t.dHold[0], t.dHold[1], t.panelD[1]);
    const tint = rangeProgress(p, t.tintOn[0], t.tintOn[1])
               * (1 - rangeProgress(p, t.tintOff[0], t.tintOff[1]));
    const railP = rangeProgress(p, t.rail[0], t.rail[1]);
    const settle = rangeProgress(p, t.settle[0], t.settle[1]);
    const workP = rangeProgress(p, t.workRail[0], t.workRail[1]);
    const workSettle = rangeProgress(p, t.workSettle[0], t.workSettle[1]);

    const s = stage.style;
    s.setProperty("--p", p.toFixed(4));
    s.setProperty("--p-intro", intro.toFixed(4));
    s.setProperty("--p-open", open.toFixed(4));
    s.setProperty("--p-a", aEnv.toFixed(4));
    s.setProperty("--p-b", bEnv.toFixed(4));
    s.setProperty("--p-c", cEnv.toFixed(4));
    s.setProperty("--p-d", dEnv.toFixed(4));
    s.setProperty("--p-tint", tint.toFixed(4));
    s.setProperty("--p-work", workP.toFixed(4));
    s.setProperty("--p-work-settle", workSettle.toFixed(4));
    s.setProperty("--p-rail", railP.toFixed(4));
    s.setProperty("--p-settle", settle.toFixed(4));
    s.setProperty("--world-scale", lerp(1, CONFIG.worldScale, open).toFixed(4));
    s.setProperty("--focus-blur", `${(tint * CONFIG.blurMax).toFixed(2)}px`);
    // hero leaves while A exits
    s.setProperty("--p-a-exit", rangeProgress(p, t.aHold[1], t.panelA[1]).toFixed(4));

    // a11y: hide offscreen panels from the accessibility tree
    setHidden(panelA, aEnv < 0.02);
    setHidden(panelB, bEnv < 0.02);
    setHidden(panelC, cEnv < 0.02);
    setHidden(panelD, dEnv < 0.02);

    // work showcase interactivity (its own gate, ahead of the services finale)
    const workLive = p >= CONFIG.workLiveAt && p < CONFIG.catalogLiveAt;
    if (workLive !== state.isWorkLive) {
      state.isWorkLive = workLive;
      workShowcase.classList.toggle("is-live", workLive);
      workShowcase.setAttribute("aria-hidden", String(!workLive));
      if (workLive) remeasureRails();
    }
    // services catalog interactivity (the finale)
    const live = p >= CONFIG.catalogLiveAt;
    if (live !== state.isCatalogLive) {
      state.isCatalogLive = live;
      catalog.classList.toggle("is-live", live);
      catalog.setAttribute("aria-hidden", String(!live));
      if (live) remeasureRails();
    }
  }

  function setHidden(el, hidden) {
    if (el._hidden !== hidden) {
      el._hidden = hidden;
      el.setAttribute("aria-hidden", String(hidden));
    }
  }

  /* ---------------- frame loop ---------------- */
  function frame() {
    state.rafId = 0;
    // pointer smoothing (independent of playhead)
    state.mx = lerp(state.mx, state.tmx, CONFIG.pointerSmooth);
    state.my = lerp(state.my, state.tmy, CONFIG.pointerSmooth);
    stage.style.setProperty("--mx", state.mx.toFixed(4));
    stage.style.setProperty("--my", state.my.toFixed(4));

    // playhead smoothing; reduced motion = snap directly
    const prev = state.p;
    state.p = reduceMotion.matches
      ? state.target
      : lerp(state.p, state.target, CONFIG.smooth);
    if (Math.abs(state.p - state.target) < 0.0004) state.p = state.target;

    if (state.p !== prev || !frame._rendered) {
      render(state.p);
      frame._rendered = true;
    }

    // keep looping only until everything converges
    const settled =
      state.p === state.target &&
      Math.abs(state.mx - state.tmx) < 0.001 &&
      Math.abs(state.my - state.tmy) < 0.001;
    if (!settled && state.stageVisible) {
      state.rafId = requestAnimationFrame(frame);
    } else {
      state.running = false;
    }
  }

  function requestFrame() {
    if (!state.running && state.stageVisible && state.rafId === 0) {
      state.running = true;
      state.rafId = requestAnimationFrame(frame);
    } else if (state.running && state.rafId === 0) {
      state.rafId = requestAnimationFrame(frame);
    }
  }

  /* ---------------- pointer parallax ---------------- */
  function onPointerMove(e) {
    if (coarsePointer.matches || reduceMotion.matches) return;
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    state.tmx = clamp(nx, -1, 1);
    state.tmy = clamp(ny, -1, 1);
    requestFrame();
  }

  /* ---------------- card rails (services + selected work) ----------------
     createRail(wrap) builds one infinite, draggable, keyboardable rail.
     `wrap` is the .rail-wrap element containing .rail, .rail-track,
     .rail-prev, .rail-next, and a .rail-status live region.          */
  const railInstances = [];
  function remeasureRails() { railInstances.forEach((r) => r.measure()); }
  function createRail(wrap) {
    const rail = wrap.querySelector(".rail");
    const track = wrap.querySelector(".rail-track");
    const prevBtn = wrap.querySelector(".rail-prev");
    const nextBtn = wrap.querySelector(".rail-next");
    const statusEl = wrap.querySelector(".rail-status");

    const R = {
      originals: 0,
      cardStep: 0,
      cloneCount: 0,

      init() {
        const cards = [...track.children];
        this.originals = cards.length;
        const before = cards.map((c) => this.clone(c));
        const after = cards.map((c) => this.clone(c));
        before.reverse().forEach((c) => track.prepend(c));
        after.forEach((c) => track.append(c));
        this.cloneCount = cards.length;
        this.measure();
        window.addEventListener("resize", () => this.measure(), { passive: true });
        prevBtn.addEventListener("click", () => this.step(-1));
        nextBtn.addEventListener("click", () => this.step(1));
        rail.addEventListener("keydown", (e) => this.onKey(e));
        rail.addEventListener("scroll", () => this.onScroll(), { passive: true });
        this.drag();
        this.jumpTo(this.cloneCount * this.cardStep, false);
      },

      clone(card) {
        const c = card.cloneNode(true);
        c.setAttribute("aria-hidden", "true");
        c.querySelectorAll("a, button, [tabindex]").forEach((el) => { el.tabIndex = -1; });
        // drop clone videos entirely: posters alone carry the loop seam
        c.querySelectorAll("video").forEach((v) => v.remove());
        return c;
      },

      measure() {
        const first = track.children[1];
        if (!first) return;
        const gap = parseFloat(getComputedStyle(track).columnGap) ||
                    parseFloat(getComputedStyle(track).gap) || 0;
        this.cardStep = first.getBoundingClientRect().width + gap;
      },

      onKey(e) {
        if (e.key === "ArrowRight") { e.preventDefault(); this.step(1); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); this.step(-1); }
        else if (e.key === "Home") { e.preventDefault(); this.goToIndex(0); }
        else if (e.key === "End") { e.preventDefault(); this.goToIndex(this.originals - 1); }
      },

      step(dir) {
        const idx = Math.round(rail.scrollLeft / this.cardStep) + dir;
        this.goToIndex(idx);
      },

      goToIndex(idx) {
        rail.scrollTo({ left: idx * this.cardStep, behavior:
          reduceMotion.matches ? "auto" : "smooth" });
        this.announce(idx);
      },

      announce(idx) {
        const real = ((idx - this.cloneCount) % this.originals + this.originals)
          % this.originals;
        statusEl.textContent = `Item ${real + 1} of ${this.originals}`;
      },

      jumpTo(x, smooth) {
        if (smooth) rail.scrollTo({ left: x, behavior: "smooth" });
        else rail.scrollLeft = x;
      },

      onScroll() {
        const set = this.originals * this.cardStep;
        if (rail.scrollLeft < this.cardStep * 0.5) {
          rail.scrollLeft += set;
        } else if (rail.scrollLeft > set + this.cardStep * (this.cloneCount - 0.5)) {
          rail.scrollLeft -= set;
        }
      },

      drag() {
        let down = false, startX = 0, startScroll = 0, moved = 0;
        rail.addEventListener("pointerdown", (e) => {
          if (e.pointerType !== "mouse") return;
          down = true; moved = 0;
          startX = e.clientX; startScroll = rail.scrollLeft;
          rail.classList.add("is-dragging");
          rail.setPointerCapture(e.pointerId);
        });
        rail.addEventListener("pointermove", (e) => {
          if (!down) return;
          const dx = e.clientX - startX;
          moved = Math.max(moved, Math.abs(dx));
          rail.scrollLeft = startScroll - dx;
        });
        const end = () => {
          if (!down) return;
          down = false;
          rail.classList.remove("is-dragging");
          if (moved > 6) {
            rail.addEventListener("click", (ev) => ev.preventDefault(),
              { capture: true, once: true });
          }
          const idx = Math.round(rail.scrollLeft / this.cardStep);
          this.goToIndex(idx);
        };
        rail.addEventListener("pointerup", end);
        rail.addEventListener("pointercancel", end);
      },
    };
    return R;
  }

  /* play/pause a work card's muted loop on hover/focus */
  function initWorkCards(scope) {
    scope.querySelectorAll(".work-card video").forEach((video) => {
      const card = video.closest(".work-card");
      const play = () => { video.play().catch(() => {}); };
      const stop = () => { video.pause(); };
      card.addEventListener("mouseenter", play);
      card.addEventListener("mouseleave", stop);
      card.addEventListener("focusin", play);
      card.addEventListener("focusout", stop);
      if (reduceMotion.matches) { video.pause(); video.removeAttribute("autoplay"); }
    });
  }

  /* ---------------- nav jumps ---------------- */
  function initNav() {
    document.querySelectorAll("[data-goto]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        if (reduceMotion.matches) {
          // reduced layout is normal flow; jump to the catalog or top
          const targetP = parseFloat(el.dataset.goto);
          const node = targetP >= 0.75 ? catalog
                     : targetP > 0 ? panelA : section;
          node.scrollIntoView({ block: "start" });
          return;
        }
        const p = clamp(parseFloat(el.dataset.goto), 0, 1);
        const top = section.offsetTop + p * state.maxScroll;
        window.scrollTo({ top, behavior: "smooth" });
      });
    });
  }

  /* ---------------- loading gate ---------------- */
  function initLoader() {
    const critical = [
      ...document.querySelectorAll(
        ".layer-bg img, .layer-mid img, .layer-hero img"
      ),
    ];
    const ready = critical.map((img) =>
      img.complete && img.naturalWidth
        ? Promise.resolve()
        : img.decode().catch(() => {})
    );
    // never trap the user behind the loader
    const timeout = new Promise((r) => setTimeout(r, 4000));
    Promise.race([Promise.all(ready), timeout]).then(() => {
      document.body.classList.add("is-loaded");
      const loader = document.getElementById("loader");
      loader.addEventListener("transitionend", () => loader.remove(),
        { once: true });
      setTimeout(() => loader.isConnected && loader.remove(), 1500);
      // late assets: doors decode while the hero holds
      requestIdleCallback?.(() => {
        document.querySelectorAll(".layer-door-l img, .layer-door-r img")
          .forEach((img) => img.decode().catch(() => {}));
      }, { timeout: 1500 });
    });
  }

  /* ---------------- offscreen pause ---------------- */
  function initVisibility() {
    new IntersectionObserver(([entry]) => {
      state.stageVisible = entry.isIntersecting;
      if (state.stageVisible) requestFrame();
    }, { threshold: 0 }).observe(section);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) requestFrame();
    });
  }

  /* ---------------- reduced motion ---------------- */
  function initMotionPrefs() {
    reduceMotion.addEventListener?.("change", () => {
      document.body.classList.toggle("reduced-motion", reduceMotion.matches);
      measure();
      render(reduceMotion.matches ? 0 : state.target);
    });
  }

  /* ---------------- boot ---------------- */
  function init() {
    // build every rail on the page (services + selected work)
    document.querySelectorAll(".rail-wrap").forEach((wrap) => createRail(wrap).init());
    initWorkCards(document);

    if (reduceMotion.matches) {
      // static hero + normal-flow content; rails still work.
      document.body.classList.add("reduced-motion");
      document.body.classList.add("is-loaded");
      document.getElementById("loader")?.remove();
      catalog.classList.add("is-live");
      catalog.setAttribute("aria-hidden", "false");
      workShowcase.classList.add("is-live");
      workShowcase.setAttribute("aria-hidden", "false");
      [panelA, panelB, panelC, panelD].forEach((el) => el.setAttribute("aria-hidden", "false"));
      initNav();
      return;
    }
    measure();
    render(0);
    initLoader();
    initNav();
    initVisibility();
    initMotionPrefs();
    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    requestFrame();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
