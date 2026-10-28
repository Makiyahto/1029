(() => {
  "use strict";

  /* =======================================================
     CONTENT CONFIG — edit the dates, password, and name here.
     Memory photos/text and the letter live directly in
     index.html instead — see the "EDIT CONTENT HERE" comments
     in that file.
     ======================================================= */
  const anniversaryConfig = {
    relationshipStart: "2022-10-29", // YYYY-MM-DD, Manila time
    anniversaryDate: "2026-10-29",   // YYYY-MM-DD, Manila time — site unlocks at 00:00 this day
    password: "1029",
    partnerName: "YOUR PARTNER'S NAME", // not required by the current design; here if you want it
  };

  /* =======================================================
     DEVELOPER SETTINGS
     Set PREVIEW_MODE to true while you're building/testing so
     the full site is reachable regardless of the real date.
     Set it back to false before sharing the link — this is
     what puts the real date lock back in force.
     ======================================================= */
  const PREVIEW_MODE = true;

  // Mutable so the dev panel's "Preview Mode: ON/OFF" button can
  // flip it during a session without editing the file.
  let previewModeActive = PREVIEW_MODE;

  /* =======================================================
     DATE MATH SETUP
     Manila (Asia/Manila, UTC+8, no DST) is a fixed offset, so
     both dates are converted to their exact UTC instant to avoid
     relying on the visitor's browser timezone for the comparison.
     ======================================================= */
  const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

  function manilaMidnightToUtcMs(yyyyMmDd) {
    const [y, m, d] = yyyyMmDd.split("-").map(Number);
    return Date.UTC(y, m - 1, d, 0, 0, 0) - MANILA_OFFSET_MS;
  }

  const UNLOCK_DATE_MS = manilaMidnightToUtcMs(anniversaryConfig.anniversaryDate);
  const RELATIONSHIP_START_MS = manilaMidnightToUtcMs(anniversaryConfig.relationshipStart);
  const PASSWORD = anniversaryConfig.password;
  const REDUCE_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* =======================================================
     ELEMENTS
     ======================================================= */
  const dateGate = document.getElementById("date-gate");
  const padlockGate = document.getElementById("padlock-gate");
  const site = document.getElementById("site");
  const player = document.getElementById("player");

  /* =======================================================
     UTIL
     ======================================================= */
  function pad(n) { return String(n).padStart(2, "0"); }

  /* =======================================================
     STEP 1 — DATE GATE
     The real, current instant is checked against UNLOCK_DATE_MS.
     Nothing about the padlock or the main site is shown, wired up,
     or reachable until this comparison passes — the sections stay
     [hidden] (removed from layout, not just visually covered) and
     their controllers are only started afterward.
     ======================================================= */
  let countdownTimer = null;

  function isUnlockDateReached() {
    // The real check is always Date.now() >= UNLOCK_DATE_MS — preview
    // mode only ever adds an OR in front of it for development, it
    // never removes or rewrites the real comparison.
    return previewModeActive || Date.now() >= UNLOCK_DATE_MS;
  }

  function renderCountdown() {
    const remaining = UNLOCK_DATE_MS - Date.now();

    if (remaining <= 0) {
      clearInterval(countdownTimer);
      proceedPastDateGate();
      return;
    }

    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    document.getElementById("cd-days").textContent = pad(days);
    document.getElementById("cd-hours").textContent = pad(hours);
    document.getElementById("cd-minutes").textContent = pad(minutes);
    document.getElementById("cd-seconds").textContent = pad(seconds);
  }

  function proceedPastDateGate() {
    dateGate.hidden = true;
    initPadlockGate();
  }

  function startDateGate() {
    dateGate.hidden = false;
    renderCountdown();
    countdownTimer = setInterval(renderCountdown, 1000);
  }

  /* =======================================================
     STEP 2 — PADLOCK GATE
     Only reachable once the date gate has actually passed.
     ======================================================= */
  function initPadlockGate() {
    padlockGate.hidden = false;

    const digits = Array.from(document.querySelectorAll(".pin-digit"));
    const padlock = document.getElementById("padlock");
    const message = document.getElementById("pin-message");

    digits[0].focus();

    function currentValue() {
      return digits.map(d => d.value).join("");
    }

    function resetDigits() {
      digits.forEach(d => (d.value = ""));
      digits[0].focus();
    }

    function checkPassword() {
      const value = currentValue();
      if (value.length < 4) return;

      if (value === PASSWORD) {
        unlockPadlock();
      } else {
        message.textContent = "That's not our number.";
        padlock.classList.add("shake");
        setTimeout(() => padlock.classList.remove("shake"), 450);
        setTimeout(resetDigits, 350);
      }
    }

    digits.forEach((input, i) => {
      input.addEventListener("input", () => {
        input.value = input.value.replace(/[^0-9]/g, "").slice(0, 1);
        if (input.value && i < digits.length - 1) {
          digits[i + 1].focus();
        }
        checkPassword();
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !input.value && i > 0) {
          digits[i - 1].focus();
        }
      });

      input.addEventListener("paste", (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData("text").replace(/[^0-9]/g, "");
        text.slice(0, 4).split("").forEach((ch, idx) => {
          if (digits[idx]) digits[idx].value = ch;
        });
        const lastFilled = Math.min(text.length, 4) - 1;
        if (digits[lastFilled]) digits[lastFilled].focus();
        checkPassword();
      });
    });

    function unlockPadlock() {
      message.textContent = "";
      padlock.classList.add("unlocked");
      digits.forEach(d => (d.blur(), (d.disabled = true)));
      const wait = REDUCE_MOTION ? 250 : 900;
      setTimeout(enterSite, wait);
    }
  }

  /* =======================================================
     STEP 3 — ENTER THE SITE
     ======================================================= */
  function enterSite() {
    padlockGate.hidden = true;
    site.hidden = false;
    player.hidden = false;

    startRelationshipCounter();
    initReveal();
    initNav();
    initTilt();
    initMemories();
    initMemoryAutoScroll();
    initMusicPlayer();

    window.scrollTo(0, 0);
  }

  /* =======================================================
     LIVE RELATIONSHIP COUNTER
     Calendar-aware difference (years / months / days / h / m / s)
     between RELATIONSHIP_START_MS and the current instant, computed
     in Manila wall-clock time.
     ======================================================= */
  function toManilaParts(instantMs) {
    return new Date(instantMs + MANILA_OFFSET_MS);
  }

  function getElapsed(startMs, nowMs) {
    const s = toManilaParts(startMs);
    const n = toManilaParts(nowMs);

    let years = n.getUTCFullYear() - s.getUTCFullYear();
    let months = n.getUTCMonth() - s.getUTCMonth();
    let days = n.getUTCDate() - s.getUTCDate();
    let hours = n.getUTCHours() - s.getUTCHours();
    let minutes = n.getUTCMinutes() - s.getUTCMinutes();
    let seconds = n.getUTCSeconds() - s.getUTCSeconds();

    if (seconds < 0) { seconds += 60; minutes -= 1; }
    if (minutes < 0) { minutes += 60; hours -= 1; }
    if (hours < 0) { hours += 24; days -= 1; }
    if (days < 0) {
      const prevMonthLastDay = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 0)).getUTCDate();
      days += prevMonthLastDay;
      months -= 1;
    }
    if (months < 0) { months += 12; years -= 1; }

    return { years, months, days, hours, minutes, seconds };
  }

  function startRelationshipCounter() {
    const els = {
      years: document.getElementById("c-years"),
      months: document.getElementById("c-months"),
      days: document.getElementById("c-days"),
      hours: document.getElementById("c-hours"),
      minutes: document.getElementById("c-minutes"),
      seconds: document.getElementById("c-seconds"),
    };

    function tick() {
      const e = getElapsed(RELATIONSHIP_START_MS, Date.now());
      els.years.textContent = e.years;
      els.months.textContent = e.months;
      els.days.textContent = e.days;
      els.hours.textContent = pad(e.hours);
      els.minutes.textContent = pad(e.minutes);
      els.seconds.textContent = pad(e.seconds);
    }

    tick();
    setInterval(tick, 1000);
  }

  /* =======================================================
     SCROLL REVEAL
     ======================================================= */
  function initReveal() {
    const targets = document.querySelectorAll("#site .reveal");
    if (REDUCE_MOTION || !("IntersectionObserver" in window)) {
      targets.forEach(t => t.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    targets.forEach(t => observer.observe(t));
  }

  /* =======================================================
     NAV — smooth scroll, active-section highlight, mobile toggle
     ======================================================= */
  function initNav() {
    const nav = document.getElementById("nav");
    const toggle = document.getElementById("nav-toggle");
    const list = document.getElementById("nav-list");
    const links = Array.from(document.querySelectorAll(".nav-list a"));
    const current = document.getElementById("nav-current");
    const sections = links
      .map(link => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);

    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    links.forEach(link => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("click", (e) => {
      if (!nav.contains(e.target)) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });

    if (!("IntersectionObserver" in window)) return;

    const spy = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          links.forEach(l => l.classList.toggle("active", l.getAttribute("href") === "#" + id));
          const activeLink = links.find(l => l.getAttribute("href") === "#" + id);
          if (activeLink) current.textContent = activeLink.dataset.section;
        }
      });
    }, { threshold: 0.5 });

    sections.forEach(s => spy.observe(s));
  }

  /* =======================================================
     TILT — subtle pointer-driven depth on hero + memory cards
     ======================================================= */
  function initTilt() {
    if (REDUCE_MOTION || window.matchMedia("(pointer: coarse)").matches) return;

    const heroContent = document.querySelector(".hero-content");
    const heroSection = document.querySelector(".hero");
    if (heroSection && heroContent) {
      heroSection.addEventListener("mousemove", (e) => {
        const rect = heroSection.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        heroContent.style.transform = `translate3d(${x * -10}px, ${y * -8}px, 0)`;
      });
      heroSection.addEventListener("mouseleave", () => {
        heroContent.style.transform = "translate3d(0,0,0)";
      });
    }

    document.querySelectorAll(".memory-card").forEach(card => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(700px) rotateX(${y * -8}deg) rotateY(${x * 10}deg) translateY(-2px)`;
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "perspective(700px) rotateX(0) rotateY(0) translateY(0)";
      });
    });
  }

  /* =======================================================
     MEMORY MODAL
     ======================================================= */
  function initMemories() {
    const overlay = document.getElementById("modal-overlay");
    const closeBtn = document.getElementById("modal-close");
    const photo = document.getElementById("modal-photo");
    const dateEl = document.getElementById("modal-date");
    const titleEl = document.getElementById("modal-title");
    const locationEl = document.getElementById("modal-location");
    const descEl = document.getElementById("modal-desc");

    let lastFocused = null;

    function openModal(card) {
      lastFocused = document.activeElement;
      const photoStyle = card.querySelector(".memory-photo").style.getPropertyValue("--photo");
      photo.style.setProperty("--photo", photoStyle || "none");
      dateEl.textContent = card.dataset.date || "";
      titleEl.textContent = card.dataset.title || "";
      locationEl.textContent = card.dataset.location || "";
      descEl.textContent = card.dataset.desc || "";
      overlay.hidden = false;
      closeBtn.focus();
      document.body.style.overflow = "hidden";
    }

    function closeModal() {
      overlay.hidden = true;
      document.body.style.overflow = "";
      if (lastFocused) lastFocused.focus();
    }

    document.querySelectorAll(".memory-card").forEach(card => {
      card.addEventListener("click", () => openModal(card));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal(card);
        }
      });
    });

    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !overlay.hidden) closeModal();
    });
  }

  /* =======================================================
     MEMORIES — right-to-left auto-scroll preview
     Drives the existing .memory-track's native scrollLeft back and
     forth (right-to-left, then reverses at the end instead of
     jumping back to the start) so it reads as one continuous,
     elegant drift rather than a hard reset. Pauses on hover, touch,
     or keyboard focus so a visitor can comfortably pick a card —
     the cards, their click handling, and keyboard access from
     initMemories() above are completely untouched.
     ======================================================= */
  function initMemoryAutoScroll() {
    const track = document.getElementById("memory-track");
    if (!track || REDUCE_MOTION) return;

    const SPEED = 0.4; // px per frame — slow and elegant, not a race
    let direction = 1; // 1 = right-to-left (scrollLeft increasing)
    let running = true;
    let resumeTimer = null;

    function pause() {
      running = false;
      clearTimeout(resumeTimer);
    }
    function resumeSoon() {
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => { running = true; }, 500);
    }

    track.addEventListener("pointerenter", pause);
    track.addEventListener("pointerleave", resumeSoon);
    track.addEventListener("touchstart", pause, { passive: true });
    track.addEventListener("touchend", resumeSoon);
    track.addEventListener("focusin", pause);
    track.addEventListener("focusout", resumeSoon);

    function step() {
      if (running) {
        const max = track.scrollWidth - track.clientWidth;
        if (max > 0) {
          track.scrollLeft += SPEED * direction;
          if (track.scrollLeft >= max) direction = -1;
          else if (track.scrollLeft <= 0) direction = 1;
        }
      }
      requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  /* =======================================================
     MUSIC PLAYER — press to play, press again to pause.
     Drives the shared #audio element; the persistent player disc
     and the center Music-section button both listen to the same
     play/pause events, so pressing either one keeps both in sync.
     ======================================================= */
  function initMusicPlayer() {
    const audio = document.getElementById("audio");
    const toggle = document.getElementById("player-toggle");
    const cta = document.getElementById("music-cta");
    const disc = toggle;

    let hasSource = true;

    async function togglePlayback() {
      if (audio.paused) {
        try {
          await audio.play();
        } catch (err) {
          hasSource = false;
        }
      } else {
        audio.pause();
      }
    }

    toggle.addEventListener("click", togglePlayback);
    if (cta) cta.addEventListener("click", togglePlayback);

    audio.addEventListener("play", () => {
      disc.classList.add("playing");
      toggle.setAttribute("aria-pressed", "true");
      toggle.setAttribute("aria-label", "Pause Libu-Libong Buwan");
      if (cta) {
        cta.classList.add("playing");
        cta.setAttribute("aria-pressed", "true");
        cta.setAttribute("aria-label", "Pause Libu-Libong Buwan");
      }
    });

    audio.addEventListener("pause", () => {
      disc.classList.remove("playing");
      toggle.setAttribute("aria-pressed", "false");
      toggle.setAttribute("aria-label", "Play Libu-Libong Buwan");
      if (cta) {
        cta.classList.remove("playing");
        cta.setAttribute("aria-pressed", "false");
        cta.setAttribute("aria-label", "Play Libu-Libong Buwan");
      }
    });

    audio.addEventListener("error", () => {
      disc.classList.remove("playing");
      if (cta) cta.classList.remove("playing");
    });
  }

  /* =======================================================
     DEV PANEL — development-only, gated entirely on the
     PREVIEW_MODE constant above. When PREVIEW_MODE is false,
     the panel element is removed from the DOM outright and no
     Ctrl+Shift+P listener is ever attached, so normal visitors
     have zero trace of it.
     ======================================================= */
  function initDevPanel() {
    const panel = document.getElementById("dev-panel");

    if (!PREVIEW_MODE) {
      if (panel) panel.remove();
      return;
    }

    const previewToggle = document.getElementById("dev-preview-toggle");
    const skipDateBtn = document.getElementById("dev-skip-date");
    const testPadlockBtn = document.getElementById("dev-test-padlock");
    const testMusicBtn = document.getElementById("dev-test-music");
    const resetBtn = document.getElementById("dev-reset");
    const closeBtn = document.getElementById("dev-close");

    function refreshPreviewLabel() {
      previewToggle.textContent = `Preview Mode: ${previewModeActive ? "ON" : "OFF"}`;
    }
    refreshPreviewLabel();

    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "P" || e.key === "p")) {
        e.preventDefault();
        panel.hidden = !panel.hidden;
      }
    });

    previewToggle.addEventListener("click", () => {
      previewModeActive = !previewModeActive;
      refreshPreviewLabel();
    });

    skipDateBtn.addEventListener("click", () => {
      clearInterval(countdownTimer);
      dateGate.hidden = true;
      if (padlockGate.hidden && site.hidden) initPadlockGate();
    });

    testPadlockBtn.addEventListener("click", () => {
      dateGate.hidden = true;
      site.hidden = true;
      player.hidden = true;
      padlockGate.hidden = false;
      const digits = document.querySelectorAll(".pin-digit");
      digits.forEach(d => { d.value = ""; d.disabled = false; });
      document.getElementById("padlock").classList.remove("unlocked");
      document.getElementById("pin-message").textContent = "";
      if (digits[0]) digits[0].focus();
    });

    testMusicBtn.addEventListener("click", () => {
      const audio = document.getElementById("audio");
      if (audio.paused) {
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    });

    resetBtn.addEventListener("click", () => {
      location.reload();
    });

    closeBtn.addEventListener("click", () => {
      panel.hidden = true;
    });
  }

  /* =======================================================
     BOOT
     ======================================================= */
  function boot() {
    initDevPanel();

    if (isUnlockDateReached()) {
      dateGate.hidden = true;
      initPadlockGate();
    } else {
      startDateGate();
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();