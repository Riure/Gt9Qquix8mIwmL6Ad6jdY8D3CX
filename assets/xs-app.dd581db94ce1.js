(() => {
  "use strict";

  /* =========================================================
     XS SHELL DEFENDER — PROTEÇÃO DA CASCA VISUAL E ANTI-INSPEÇÃO
     ========================================================= */

  // 1. Bloqueio de Clique Direito, Seleção de Texto e Arraste de Imagens
  document.addEventListener("contextmenu", (e) => e.preventDefault(), false);
  document.addEventListener("selectstart", (e) => e.preventDefault(), false);
  document.addEventListener("dragstart", (e) => e.preventDefault(), false);

  // 2. Bloqueio de Teclas de Atalho do DevTools / Inspecionar / Salvar
  document.addEventListener("keydown", (e) => {
    const k = e.key.toUpperCase();
    // F12
    if (e.key === "F12") {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C (Inspecionar / Console)
    if (e.ctrlKey && e.shiftKey && (k === "I" || k === "J" || k === "C")) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    // Ctrl+U (Ver Código-Fonte) e Ctrl+S (Salvar Página)
    if (e.ctrlKey && (k === "U" || k === "S")) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);

  // 3. Armadilha Anti-DevTools Ativa (Congela a execução se o DevTools for aberto)
  (() => {
    function devtoolsTrap() {
      const start = performance.now();
      debugger;
      if (performance.now() - start > 100) {
        document.body.innerHTML = '<div style="display:grid;place-items:center;height:100vh;background:#080a16;color:#ff63d8;font-family:sans-serif;font-weight:700;">Acesso protegido.</div>';
      }
    }
    setInterval(devtoolsTrap, 800);
  })();

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const STORE = "xs-v11-config";
  const LEGACY_STORE = "xs-v10-config";
  const PROFILES_STORE = "xs-v11-profiles";
  const LEGACY_PROFILES_STORE = "xs-v10-profiles";
  const ACTIVE_PROFILE = "xs-v10-active-profile";
  const LEGACY_ACTIVE_PROFILE = "xs-v9-active-profile";
  const OWNER_SECRET_STORE = "xs-v11-owner-secret";
  const OWNER_PASSKEY_STORE = "xs-v11-owner-passkey";

  const app = $("#app");
  const audio = $("#audio");
  let config = loadConfig();
  let draft = clone(config);
  let settingsTab = "appearance";
  let ownerAuthenticated = false;
  let trackIndex = 0;
  let quoteIndex = 0;
  let quoteTimer = null;
  let lightboxIndex = 0;
  let lightboxAlbum = "Todos";
  let zoom = 1;
  let attempts = 0;
  let lockedUntil = 0;
  let visualizerRAF = 0;
  let analyser = null;
  let audioCtx = null;
  let sourceNode = null;
  let ownerAttempts = 0;
  let ownerLockedUntil = 0;
  let ownerSessionTimer = 0;
  let lastAdminActivity = Date.now();
  let remoteChallengeToken = "";
  let remoteAdminSession = sessionStorage.getItem("xs-v13-admin-session") || "";
  let remoteAdminExpiresAt = Number(sessionStorage.getItem("xs-v15-admin-expires-at") || 0);
  let adminSessionStatusTimer = 0;
  let otpCountdownTimer = 0;
  let managerResumeTimer = 0;
  let managerResumeUntil = Number(sessionStorage.getItem("xs-v16-manager-resume-until") || 0);
  const MANAGER_RESUME_MS = 5 * 60_000;

  let cachedAccent = "#ff63d8";
  let cachedAccent2 = "#6ddcff";

  const ICONS = {
    home: `<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/></svg>`,
    friends: `<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    gallery: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/></svg>`,
    music: `<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    links: `<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.07.07l2-2A5 5 0 0 0 12 4"/><path d="M14 11a5 5 0 0 0-7.07-.07l-2 2A5 5 0 0 0 12 20"/></svg>`,
    admin: `<svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="3"/><path d="m10.2 12.8 7.1-7.1a2.1 2.1 0 0 1 3 3l-1.4 1.4-1.5-1.5-2 2 1.5 1.5-2 2-1.5-1.5-3.2 3.2"/></svg>`,
    logout: `<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>`
  };

  const UI_THEMES = {
    glass: { label: "Glass", desc: "Vidro futurista e navegação lateral.", preview: "glass" },
    minimal: { label: "Minimal", desc: "Dock inferior, menos ruído e mais wallpaper.", preview: "minimal" },
    cyber: { label: "Cyber", desc: "HUD técnico, grid e composição lateral.", preview: "cyber" },
    floating: { label: "Floating", desc: "Dock flutuante e painéis suaves.", preview: "floating" },
    compact: { label: "Compact", desc: "Conteúdo concentrado e rápido.", preview: "compact" },
    luxe: { label: "Luxe", desc: "Navegação superior e acabamento editorial.", preview: "luxe" },
    custom: { label: "Studio", desc: "Layout autoral criado por você no XS Studio.", preview: "custom" }
  };

  const PRESETS = {
    pastel: { accent: "#ff8bd8", accent2: "#8bdcff", pageColor: "#171421", panelColor: "#2a2132", sidebarColor: "#211c2b", textColor: "#fff9ff", mutedColor: "#c6b9ca", overlayColor: "#25172a", overlayOpacity: .34 },
    neon: { accent: "#ff4fd8", accent2: "#4be8ff", pageColor: "#050714", panelColor: "#0b1022", sidebarColor: "#090d1b", textColor: "#f6fbff", mutedColor: "#98a9bd", overlayColor: "#03050d", overlayOpacity: .50 },
    dark: { accent: "#a78bfa", accent2: "#5eead4", pageColor: "#07080c", panelColor: "#101116", sidebarColor: "#0c0d11", textColor: "#f4f4f5", mutedColor: "#a1a1aa", overlayColor: "#020205", overlayOpacity: .58 },
    aurora: { accent: "#c084fc", accent2: "#22d3ee", pageColor: "#07151a", panelColor: "#112229", sidebarColor: "#0b1b21", textColor: "#ecfeff", mutedColor: "#a5c8cf", overlayColor: "#071016", overlayOpacity: .38 },
    rose: { accent: "#ff6f91", accent2: "#ffd166", pageColor: "#1b1017", panelColor: "#2a1822", sidebarColor: "#24131c", textColor: "#fff7fa", mutedColor: "#d0aeba", overlayColor: "#1c0e15", overlayOpacity: .40 },
    ice: { accent: "#7dd3fc", accent2: "#c4b5fd", pageColor: "#07131c", panelColor: "#10212c", sidebarColor: "#0b1822", textColor: "#f0f9ff", mutedColor: "#a9c3d2", overlayColor: "#061018", overlayOpacity: .42 }
  };

  const HOME_LABELS = {
    greeting: "Saudação", status: "Status", clock: "Relógio", date: "Data", quote: "Frase", avatar: "Avatar", quicklinks: "Links rápidos"
  };

  function merge(a, b) {
    if (!b || typeof b !== "object") return a;
    for (const k of Object.keys(b)) {
      if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k])) a[k] = merge(a[k], b[k]);
      else a[k] = b[k];
    }
    return a;
  }

  function migrate(raw) {
    const previousSchema = Number(raw?.schemaVersion || 0);
    const c = merge(clone(window.CONFIG_BASE), raw || {});
    c.schemaVersion = 12;
    c.gallery = (c.gallery || []).map((g, i) => typeof g === "string" ? { src: g, title: `Momento ${String(i + 1).padStart(2, "0")}`, caption: "", album: "Destaques" } : { album: "Destaques", ...g });
    c.home = merge(clone(window.CONFIG_BASE.home), c.home || {});
    c.motion = merge(clone(window.CONFIG_BASE.motion), c.motion || {});
    c.appearance = merge(clone(window.CONFIG_BASE.appearance), c.appearance || {});
    c.lockAppearance = merge(clone(window.CONFIG_BASE.lockAppearance), c.lockAppearance || {});
    c.owner = merge(clone(window.CONFIG_BASE.owner), c.owner || {});
    if (previousSchema < 12 && Number(c.owner.sessionMinutes) === 15) c.owner.sessionMinutes = 30;
    c.auth = merge(clone(window.CONFIG_BASE.auth), c.auth || {});
    c.appearance.customLayout = merge(clone(window.CONFIG_BASE.appearance.customLayout || {}), c.appearance.customLayout || {});
    c.modules = merge(clone(window.CONFIG_BASE.modules), c.modules || {});
    c.player = merge(clone(window.CONFIG_BASE.player), c.player || {});
    return c;
  }

  function storageGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
  function storageSet(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } }
  function storageRemove(k) { try { localStorage.removeItem(k); return true; } catch { return false; } }

  function fmtCountdown(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(total / 60)).padStart(2,"0")}:${String(total % 60).padStart(2,"0")}`;
  }

  function setRemoteAdminExpiry(seconds) {
    const value = Math.max(0, Number(seconds || 0));
    remoteAdminExpiresAt = value ? Date.now() + value * 1000 : 0;
    if (remoteAdminExpiresAt) sessionStorage.setItem("xs-v15-admin-expires-at", String(remoteAdminExpiresAt));
    else sessionStorage.removeItem("xs-v15-admin-expires-at");
    updateAdminSessionStatus();
  }

  function updateAdminSessionStatus() {
    const pill = $("#adminSessionPill"), value = $("#adminSessionTime");
    if (!pill || !value) return;

    if (!ownerAuthenticated) {
      pill.className = "admin-session-pill compact offline";
      value.textContent = "Sessão bloqueada";
      return;
    }

    const remaining = remoteAdminExpiresAt
      ? remoteAdminExpiresAt - Date.now()
      : Math.max(0, Number(config.owner.sessionMinutes || 30) * 60000 - (Date.now() - lastAdminActivity));

    if (remaining <= 0) {
      pill.className = "admin-session-pill compact warning";
      value.textContent = "Sessão expirada";
      if (remoteAdminExpiresAt) setTimeout(() => lockAdmin("Sessão Admin expirada"), 0);
      return;
    }

    pill.className = `admin-session-pill compact ${remaining <= 300000 ? "warning" : "active"}`;
    value.textContent = `Sessão ${fmtCountdown(remaining)}`;
  }

  function startAdminSessionStatus() {
    clearInterval(adminSessionStatusTimer);
    updateAdminSessionStatus();
    adminSessionStatusTimer = setInterval(updateAdminSessionStatus, 1000);
  }

  function clearManagerResumeTimer() {
    clearTimeout(managerResumeTimer);
    managerResumeTimer = 0;
  }

  function clearManagerResumeWindow() {
    clearManagerResumeTimer();
    managerResumeUntil = 0;
    sessionStorage.removeItem("xs-v16-manager-resume-until");
  }

  function managerSessionStillValid() {
    if (!ownerAuthenticated) return false;
    if (remoteAdminExpiresAt && remoteAdminExpiresAt <= Date.now()) return false;
    return true;
  }

  function revokeManagerSession(message = "") {
    clearManagerResumeWindow();
    ownerAuthenticated = false;
    clearTimeout(ownerSessionTimer);
    clearInterval(adminSessionStatusTimer);

    if (remoteAdminSession && authApiBase()) {
      authRequest("/api/admin/session/logout", { token: remoteAdminSession }).catch(() => {});
    }

    remoteAdminSession = "";
    remoteAdminExpiresAt = 0;
    sessionStorage.removeItem("xs-v13-admin-session");
    sessionStorage.removeItem("xs-v15-admin-expires-at");
    updateAdminSessionStatus();
    if (message) toast(message);
  }

  function scheduleManagerReauth() {
    clearManagerResumeTimer();
    if (!managerSessionStillValid()) {
      clearManagerResumeWindow();
      return;
    }

    managerResumeUntil = Date.now() + MANAGER_RESUME_MS;
    sessionStorage.setItem("xs-v16-manager-resume-until", String(managerResumeUntil));

    managerResumeTimer = setTimeout(() => {
      if (!document.documentElement.classList.contains("manager-open")) {
        revokeManagerSession("");
      }
    }, MANAGER_RESUME_MS + 50);
  }

  function minimizeManagerToHome() {
    document.documentElement.classList.remove("manager-open");
    document.body.classList.remove("manager-open");
    document.documentElement.dataset.previewMode = "auto";

    hideOwnerGate();
    $("#adminModal")?.close?.();
    $("#notifPanel")?.classList.add("hidden");
    $("#lightbox")?.classList.add("hidden");

    draft = clone(config);
    applyTheme(config);
    applyLockTheme(config);

    renderIdentity();
    buildNav();
    renderHome();

    openView("home");

    const content = $("#settingsContent");
    if (content) content.scrollTop = 0;

    scheduleManagerReauth();
  }

  async function enterManagerFromKey() {
    if (managerSessionStillValid()) {
      if (managerResumeUntil && Date.now() > managerResumeUntil) {
        revokeManagerSession("");
        return showOwnerGate();
      }

      clearManagerResumeWindow();
      openView("settings");
      adminSessionTouch();
      startAdminSessionStatus();
      return;
    }

    if (remoteOtpEnabled() && remoteAdminSession) {
      try {
        const restored = await authRequest("/api/admin/session/validate", { token: remoteAdminSession });
        setRemoteAdminExpiry(restored.expiresIn || 0);
        ownerAuthenticated = true;
        clearManagerResumeWindow();
        openView("settings");
        adminSessionTouch();
        startAdminSessionStatus();
        return;
      } catch {
        remoteAdminSession = "";
        remoteAdminExpiresAt = 0;
        sessionStorage.removeItem("xs-v13-admin-session");
        sessionStorage.removeItem("xs-v15-admin-expires-at");
      }
    }

    showOwnerGate();
  }

  function adminSessionTouch() {
    lastAdminActivity = Date.now();
    clearTimeout(ownerSessionTimer);
    if (!ownerAuthenticated) return;
    const mins = Math.max(1, Number(config.owner.sessionMinutes || 30));
    ownerSessionTimer = setTimeout(() => lockAdmin("Sessão Admin encerrada por inatividade"), mins * 60000);
  }

  function lockAdmin(message = "Admin bloqueado") {
    document.documentElement.classList.remove("manager-open");
    clearManagerResumeWindow();
    ownerAuthenticated = false;
    clearTimeout(ownerSessionTimer);
    if (remoteAdminSession && authApiBase()) authRequest("/api/admin/session/logout", { token: remoteAdminSession }).catch(() => {});
    remoteAdminSession = ""; 
    sessionStorage.removeItem("xs-v13-admin-session"); 
    setRemoteAdminExpiry(0); 
    clearInterval(adminSessionStatusTimer);
    if ($("#view-settings")?.classList.contains("active")) openView("home");
    if (message) toast(message);
  }

  function grantAdmin(message = "Modo Admin desbloqueado") {
    ownerAuthenticated = true;
    clearManagerResumeWindow();
    ownerAttempts = 0;
    hideOwnerGate();
    openView("settings");
    adminSessionTouch();
    startAdminSessionStatus();
    toast(message);
  }

  function loadConfig() {
    try {
      const raw = storageGet(STORE) || storageGet(LEGACY_STORE);
      return migrate(raw ? JSON.parse(raw) : window.CONFIG_BASE);
    } catch { return migrate(window.CONFIG_BASE); }
  }

  function persist() { storageSet(STORE, JSON.stringify(config)); }
  function esc(v = "") { return String(v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c])); }
  function hexRgb(hex) { const h = String(hex || "#000").replace("#", ""); const v = h.length === 3 ? h.split("").map(x => x + x).join("") : h.padEnd(6, "0"); return `${parseInt(v.slice(0, 2), 16) || 0},${parseInt(v.slice(2, 4), 16) || 0},${parseInt(v.slice(4, 6), 16) || 0}`; }
  function toast(msg, type = "ok") { const t = $("#toast"); if (!t) return; t.textContent = msg; t.className = `toast ${type}`; clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add("hidden"), 2200); }

  function showAdminModal({ title, text = "", confirmText = "Confirmar", danger = false, fields = [] }) {
    return new Promise(resolve => {
      const dialog = $("#adminModal"), wrap = $("#adminModalFields"), confirmBtn = $("#adminModalConfirm");
      if (!dialog) return resolve(null);
      $("#adminModalTitle").textContent = title; 
      $("#adminModalText").textContent = text; 
      confirmBtn.textContent = confirmText;
      confirmBtn.className = danger ? "danger-confirm-btn" : "accent-btn";
      wrap.innerHTML = fields.map((f, i) => `<label class="admin-modal-field"><span>${esc(f.label || "Campo")}</span><input id="adminModalField${i}" type="${esc(f.type || "text")}" value="${esc(f.value || "")}" placeholder="${esc(f.placeholder || "")}" autocomplete="${f.type === "password" ? "new-password" : "off"}"></label>`).join("");
      const done = () => { const result = dialog.returnValue === "confirm" ? fields.map((_, i) => $(`#adminModalField${i}`)?.value ?? "") : null; cleanup(); resolve(result); };
      const cleanup = () => { dialog.removeEventListener("close", done); };
      dialog.addEventListener("close", done, { once: true }); 
      dialog.showModal(); 
      setTimeout(() => $("#adminModalField0")?.focus(), 40);
    });
  }

  function effectiveAppearance(source = config) {
    const a = clone(source.appearance || {});
    if (a.autoDayNight) {
      const h = new Date().getHours();
      const key = h >= 7 && h < 18 ? a.dayPreset : a.nightPreset;
      if (PRESETS[key]) Object.assign(a, PRESETS[key]);
    }
    return a;
  }

  function applyTheme(source = config) {
    const a = effectiveAppearance(source);
    const m = source.motion || config.motion;
    const r = document.documentElement;
    cachedAccent = a.accent || "#ff63d8";
    cachedAccent2 = a.accent2 || "#6ddcff";

    r.dataset.uiTheme = a.interfaceTheme || "glass";
    r.dataset.transition = m.transition || "fade";
    r.dataset.reducedMotion = m.reducedMotion ? "true" : "false";
    r.style.setProperty("--accent", cachedAccent);
    r.style.setProperty("--accent2", cachedAccent2);
    r.style.setProperty("--page", a.pageColor || "#080a16");
    r.style.setProperty("--panel-rgb", hexRgb(a.panelColor || "#111426"));
    r.style.setProperty("--sidebar-rgb", hexRgb(a.sidebarColor || "#0d1020"));
    r.style.setProperty("--text", a.textColor || "#f7f5ff");
    r.style.setProperty("--muted", a.mutedColor || "#a8abc2");
    r.style.setProperty("--border-rgb", hexRgb(a.borderColor || "#fff"));
    r.style.setProperty("--border-alpha", Number(a.borderOpacity ?? .1));
    r.style.setProperty("--panel-alpha", Number(a.panelOpacity ?? .46));
    r.style.setProperty("--sidebar-alpha", Number(a.sidebarOpacity ?? .54));
    r.style.setProperty("--blur", `${Number(a.blur ?? 22)}px`);
    r.style.setProperty("--glow", Number(a.glow ?? 65) / 100);
    r.style.setProperty("--font-scale", Number(a.fontScale ?? 1));
    r.style.setProperty("--desktop-scale", Number(a.desktopScale ?? 1));
    r.style.setProperty("--mobile-scale", Number(a.mobileScale ?? 1));
    r.style.setProperty("--content-max", `${Number(a.contentMaxWidth ?? 1180)}px`);
    r.style.setProperty("--sidebar-size", `${Number(a.sidebarSize ?? 86)}px`);
    r.style.setProperty("--mobile-dock-size", `${Number(a.mobileDockSize ?? 66)}px`);
    const cl = a.customLayout || {};
    r.dataset.customNav = cl.navPosition || "left";
    r.dataset.customNavStyle = cl.navStyle || "rail";
    r.dataset.customSurface = cl.surfaceStyle || "glass";
    r.dataset.customDensity = cl.density || "comfortable";
    r.dataset.customHeader = cl.headerStyle || "compact";
    r.dataset.customTile = cl.tileShape || "square";
    r.dataset.customLabels = cl.showNavLabels === false ? "off" : "on";
    r.style.setProperty("--custom-card-radius", `${Number(cl.cardRadius ?? 22)}px`);
    r.style.setProperty("--custom-button-radius", `${Number(cl.buttonRadius ?? 12)}px`);
    r.style.setProperty("--custom-icon-size", `${Number(cl.iconSize ?? 22)}px`);
    r.style.setProperty("--custom-icon-weight", Number(cl.iconWeight ?? 1.8));
    r.style.setProperty("--custom-box-gap", `${Number(cl.boxGap ?? 12)}px`);
    r.style.setProperty("--custom-panel-padding", `${Number(cl.panelPadding ?? 24)}px`);
    r.style.setProperty("--custom-widget-width", `${Number(cl.widgetWidth ?? 980)}px`);
    r.style.setProperty("--custom-shadow", Number(cl.shadowStrength ?? 55) / 100);
    r.style.setProperty("--motion", Math.max(.1, Number(m.intensity ?? .75)));
    document.body.style.background = a.pageColor || "#080a16";

    const mobile = matchMedia("(max-width:580px)").matches && String(a.wallpaperMobile || "").trim();
    const bg = mobile ? a.wallpaperMobile : a.wallpaper;
    const wp = $("#wallpaper");
    if (wp) {
      wp.style.backgroundImage = bg ? `url("${String(bg).replace(/"/g, '\\"')}")` : "";
      wp.style.backgroundSize = a.backgroundSize || "cover";
      wp.style.backgroundPosition = a.backgroundPosition || "center center";
    }
    const overlay = $("#overlay");
    if (overlay) overlay.style.background = `rgba(${hexRgb(a.overlayColor || "#050712")},${Number(a.overlayOpacity ?? .44)})`;
    const ambient = $("#ambient");
    if (ambient) {
      ambient.classList.toggle("off", a.ambientGlow === false);
      ambient.classList.toggle("no-particles", a.particles === false);
    }
    const cursorGlow = $("#cursorGlow");
    if (cursorGlow) cursorGlow.classList.toggle("on", !!m.cursorGlow && !m.reducedMotion);

    const video = $("#bgVideo");
    if (video) {
      const videoUrl = String(a.backgroundVideo || "").trim();
      if (videoUrl) {
        if (video.src !== new URL(videoUrl, location.href).href) video.src = videoUrl;
        video.classList.add("active");
        video.play().catch(() => {});
      } else {
        video.pause(); video.removeAttribute("src"); video.classList.remove("active");
      }
    }
    document.title = source.profile?.pageTitle || `@${source.profile?.regname || "user"} · xatspace`;
  }

  function applyLockTheme(source = config) {
    const l = source.lockAppearance || window.CONFIG_BASE.lockAppearance;
    const r = document.documentElement;
    r.dataset.lockTheme = l.theme || "orbital";
    r.dataset.lockDot = l.dotStyle || "ring";
    r.style.setProperty("--lock-accent", l.accent || "#ff63d8");
    r.style.setProperty("--lock-accent2", l.accent2 || "#6ddcff");
    r.style.setProperty("--lock-page", l.pageColor || "#080a16");
    r.style.setProperty("--lock-text", l.textColor || "#f7f5ff");
    r.style.setProperty("--lock-muted", l.mutedColor || "#a8abc2");
    r.style.setProperty("--lock-overlay-rgb", hexRgb(l.overlayColor || "#060713"));
    r.style.setProperty("--lock-overlay-alpha", Number(l.overlayOpacity ?? .5));
    r.style.setProperty("--lock-glow", Number(l.glow ?? 75) / 100);
    r.style.setProperty("--lock-pattern-size", `${Number(l.patternSize ?? 300)}px`);
    const lock = $("#lockScreen");
    if (lock) {
      lock.style.setProperty("--lock-wallpaper", String(l.wallpaper || "").trim() ? `url("${String(l.wallpaper).replace(/"/g, '\\"')}")` : "none");
    }
    const lTitle = $("#lockTitle"), lSub = $("#lockSubtitle"), lKicker = $("#lockKicker"), lClear = $("#clearPattern");
    if (lTitle) lTitle.textContent = l.title || "Conecte seu padrão";
    if (lSub) lSub.textContent = l.subtitle || "Desenhe a sequência para acessar.";
    if (lKicker) {
      lKicker.textContent = l.kicker || "PRIVATE SPACE";
      lKicker.style.display = l.showKicker === false ? "none" : "";
    }
    if (lClear) lClear.style.display = l.showClear === false ? "none" : "";
  }

  function renderIdentity() {
    const p = config.profile;
    const rName = $("#topRegname"), rUid = $("#topUid"), av = $("#topAvatar");
    if (rName) rName.textContent = `@${p.regname || "user"}`;
    if (rUid) rUid.textContent = `UID ${p.uid || "—"}`;
    if (av) av.style.backgroundImage = p.avatar ? `url("${String(p.avatar).replace(/"/g, '\\"')}")` : "";
  }

  function greeting() {
    const h = new Date().getHours();
    if (config.home.greetingMode === "custom") return config.home.customGreeting || "Bem-vindo";
    return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  }

  function currentQuote() {
    const list = config.quotes || [];
    if (!list.length) return "";
    if (config.quoteSettings.mode === "random") return list[Math.floor(Math.random() * list.length)];
    if (config.quoteSettings.mode === "fixed") return list[0];
    return list[quoteIndex % list.length];
  }

  function renderHome() {
    const p = config.profile, h = config.home;
    const now = new Date();
    const enabled = (h.modules || []).filter(x => x.enabled !== false);
    const parts = [];
    for (const mod of enabled) {
      if (mod.id === "greeting") parts.push(`<div class="home-greeting">${esc(greeting())},<br><strong>@${esc(p.regname || "user")}</strong></div>`);
      if (mod.id === "status") parts.push(`<div class="home-status"><i style="background:${esc(p.statusColor || "#57e6b1")};box-shadow:0 0 10px ${esc(p.statusColor || "#57e6b1")}"></i>${esc(p.status || "Online")}</div>`);
      if (mod.id === "clock") parts.push(`<div id="homeClock" class="home-clock">${formatClock(now)}</div>`);
      if (mod.id === "date") parts.push(`<div id="homeDate" class="home-date">${formatDate(now)}</div>`);
      if (mod.id === "quote") parts.push(`<div id="homeQuote" class="home-quote">${esc(currentQuote())}</div>`);
      if (mod.id === "avatar" && p.avatar) parts.push(`<img class="home-avatar" src="${esc(p.avatar)}" alt="Avatar">`);
      if (mod.id === "quicklinks") parts.push(`<div class="home-quicklinks">${(config.links || []).slice(0, 4).map(l => `<a href="${esc(l.url || "#")}" target="_blank" rel="noopener noreferrer">${esc(l.label || "Link")}</a>`).join("")}</div>`);
    }
    const hero = $("#hero"), homeMods = $("#homeModules");
    if (hero) hero.dataset.homeLayout = h.layout || "center";
    if (homeMods) homeMods.innerHTML = parts.join("");
  }

  function formatClock(d) {
    const opt = { hour: "2-digit", minute: "2-digit", hour12: !config.home.clock24h };
    if (config.home.showSeconds) opt.second = "2-digit";
    return new Intl.DateTimeFormat("pt-BR", opt).format(d);
  }
  function formatDate(d) { return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(d).replace(/^./, c => c.toUpperCase()); }
  function updateClock() { const d = new Date(); const c = $("#homeClock"); const dt = $("#homeDate"); if (c) c.textContent = formatClock(d); if (dt) dt.textContent = formatDate(d); }
  function restartQuoteTimer() {
    clearInterval(quoteTimer);
    quoteIndex = 0;
    if (config.quoteSettings.mode === "rotate" && (config.quotes || []).length > 1) {
      quoteTimer = setInterval(() => { quoteIndex++; const q = $("#homeQuote"); if (q) q.textContent = currentQuote(); }, Math.max(3, Number(config.quoteSettings.intervalSeconds || 14)) * 1000);
    }
  }

  function buildNav() {
    const m = config.modules || {};
    const items = [["home", "Início", true], ["friends", "Amigos", m.friends !== false], ["gallery", "Galeria", m.gallery !== false], ["music", "Música", m.music !== false], ["links", "Links", m.links !== false], ["admin", "Admin", true], ["logout", "Sair", true]].filter(x => x[2]);
    const nav = $("#nav");
    if (!nav) return;
    nav.innerHTML = items.map(([id, l]) => `<button type="button" class="nav-btn ${id === "home" ? "active" : ""} ${id === "admin" ? "admin-key" : ""} ${id === "logout" ? "logout" : ""}" data-view="${id}" aria-label="${l}">${ICONS[id]}<span>${l}</span></button>`).join("");
    $$(".nav-btn", nav).forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.view;
      if (id === "logout") return logout();
      if (id === "admin") return enterManagerFromKey();
      openView(id);
    }));
  }

  function openView(id) {
    if (id === "settings" && !ownerAuthenticated) return showOwnerGate();
    $$(".view").forEach(v => v.classList.toggle("active", v.id === `view-${id}`));
    if (id === "settings") {
      clearManagerResumeWindow();
      document.documentElement.classList.add("manager-open");
    } else {
      document.documentElement.classList.remove("manager-open");
    }
    $$(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === id));
    if (id === "settings") { draft = clone(config); renderSettings(); }
    if (id === "music") { renderTrackList(); drawVisualizer(); }
    updateNowPlaying();
  }
  function closeToHome() { openView("home"); applyTheme(config); }
  function logout() { 
    if (audio) audio.pause(); 
    lockAdmin(""); 
    app.classList.remove("unlocked"); 
    app.classList.add("locked"); 
    document.body.classList.remove("focus-mode"); 
    openView("home"); 
    mainPattern.reset(); 
    hideOwnerGate(); 
    $("#notifPanel")?.classList.add("hidden"); 
    $("#lightbox")?.classList.add("hidden"); 
    toast("Perfil bloqueado"); 
  }
  function unlock() { app.classList.remove("locked"); app.classList.add("unlocked"); renderAll(); }

  function createPatternLock({ root, canvas, dotSelector, target, minPoints, feedback, onSuccess, onError, remoteValidate }) {
    if (!root || !canvas) return { reset: () => {}, resize: () => {}, validate: () => {}, getSelected: () => [] };
    const dots = [...root.querySelectorAll(dotSelector)];
    const polyline = canvas.querySelector(".pattern-polyline");
    const tail = canvas.querySelector(".pattern-tail");
    const isOwner = root.id === "ownerPattern";
    const clearButton = root.id === "pattern" ? $("#clearPattern") : (isOwner ? $("#clearOwnerPattern") : null);

    let drawing = false;
    let activePointerId = null;
    let selected = [];
    let validating = false;
    let lastClient = null;

    const idxOf = dot => Number(dot.dataset.dot ?? dot.dataset.ownerDot);
    const minRequired = () => Math.max(1, Number(typeof minPoints === "function" ? minPoints() : minPoints) || 4);

    function setFeedback(text, state = "") {
      if (!feedback) return;
      feedback.textContent = text;
      feedback.className = `feedback${state ? " " + state : ""}`;
    }

    function rootRect() { return root.getBoundingClientRect(); }

    function centerClient(dot) {
      const r = dot.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    function centerLocal(dot) {
      const rr = rootRect();
      const c = centerClient(dot);
      return { x: c.x - rr.left, y: c.y - rr.top };
    }

    function clientToLocal(x, y) {
      const r = rootRect();
      return { x: x - r.left, y: y - r.top };
    }

    function distanceToSegment(p, a, b) {
      const vx = b.x - a.x, vy = b.y - a.y;
      const wx = p.x - a.x, wy = p.y - a.y;
      const len = vx * vx + vy * vy;
      const t = len ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len)) : 0;
      const x = a.x + t * vx, y = a.y + t * vy;
      return { d: Math.hypot(p.x - x, p.y - y), t };
    }

    function nearestClient(x, y, radius = 48) {
      let best = null;
      for (const dot of dots) {
        const c = centerClient(dot);
        const d = Math.hypot(c.x - x, c.y - y);
        if (d <= radius && (!best || d < best.d)) best = { dot, idx: idxOf(dot), d };
      }
      return best;
    }

    function hitFromPoint(x, y) {
      const stack = document.elementsFromPoint?.(x, y) || [];
      const direct = stack.find(el => el?.matches?.(dotSelector) && root.contains(el));
      if (direct) return { dot: direct, idx: idxOf(direct), d: 0 };
      return nearestClient(x, y);
    }

    function crossedClient(a, b) {
      const hits = [];
      for (const dot of dots) {
        const idx = idxOf(dot);
        if (selected.includes(idx)) continue;
        const c = centerClient(dot);
        const hit = distanceToSegment(c, a, b);
        if (hit.d <= 34) hits.push({ idx, t: hit.t });
      }
      hits.sort((m, n) => m.t - n.t).forEach(h => add(h.idx));
    }

    function updateSvg(clientPoint = null) {
      const pts = selected
        .map(idx => dots.find(d => idxOf(d) === idx))
        .filter(Boolean)
        .map(centerLocal);

      polyline?.setAttribute("points", pts.map(p => `${p.x},${p.y}`).join(" "));

      if (drawing && clientPoint && pts.length && tail) {
        const last = pts[pts.length - 1];
        const local = clientToLocal(clientPoint.x, clientPoint.y);
        tail.setAttribute("x1", last.x);
        tail.setAttribute("y1", last.y);
        tail.setAttribute("x2", local.x);
        tail.setAttribute("y2", local.y);
      } else if (tail) {
        tail.removeAttribute("x1");
        tail.removeAttribute("y1");
        tail.removeAttribute("x2");
        tail.removeAttribute("y2");
      }
    }

    function syncClear() {
      if (!clearButton) return;
      clearButton.disabled = selected.length === 0 || validating;
      clearButton.classList.toggle("is-ready", !clearButton.disabled);
    }

    function add(idx) {
      if (idx == null || selected.includes(idx)) return;
      selected.push(idx);
      dots.find(d => idxOf(d) === idx)?.classList.add("selected");
      syncClear();
      updateSvg(lastClient);
    }

    function clearVisual() {
      dots.forEach(d => d.classList.remove("selected", "error"));
    }

    function stopGesture() {
      drawing = false;
      activePointerId = null;
      lastClient = null;
      root.classList.remove("is-drawing");
      updateSvg();
    }

    function reset(message) {
      stopGesture();
      validating = false;
      selected = [];
      clearVisual();
      syncClear();
      setFeedback(message || feedback?.dataset.default || (isOwner ? "Acesso restrito" : "Desenhe o padrão"));
      updateSvg();
    }

    function fail(message) {
      stopGesture();
      dots.forEach(d => d.classList.add("error"));
      setFeedback(message, "error");
      onError?.(selected.slice());
      setTimeout(() => reset(), 850);
    }

    async function validate() {
      if (validating || !selected.length) return;
      if (selected.length < minRequired()) return fail("Padrão muito curto");

      validating = true;
      syncClear();

      const remote = typeof remoteValidate === "function" ? remoteValidate() : !!remoteValidate;
      if (remote) {
        setFeedback("Validando…");
        try {
          await onSuccess?.(selected.slice());
        } catch (err) {
          validating = false;
          syncClear();
          fail(err?.message || "Falha na validação");
          return;
        }
        validating = false;
        syncClear();
        return;
      }

      const expected = typeof target === "function" ? target() : target;
      const ok = Array.isArray(expected) &&
        selected.length === expected.length &&
        selected.every((v, i) => v === expected[i]);

      if (!ok) {
        validating = false;
        return fail("Padrão incorreto");
      }

      setFeedback("Acesso liberado", "success");
      await onSuccess?.(selected.slice());
      validating = false;
    }

    function allowed() {
      if (validating) return false;
      if (root.id === "pattern" && Date.now() < lockedUntil) return false;
      if (root.id === "ownerPattern" && ownerLocked()) return false;
      return true;
    }

    function begin(e, dot) {
      if (!allowed()) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;

      e.preventDefault();
      e.stopPropagation();

      selected = [];
      clearVisual();
      syncClear();

      drawing = true;
      activePointerId = e.pointerId;
      lastClient = { x: e.clientX, y: e.clientY };
      root.classList.add("is-drawing");

      add(idxOf(dot));
      updateSvg(lastClient);

      try { dot.setPointerCapture?.(e.pointerId); } catch {}
    }

    function move(e) {
      if (!drawing || e.pointerId !== activePointerId) return;
      e.preventDefault();

      const current = { x: e.clientX, y: e.clientY };
      if (lastClient) crossedClient(lastClient, current);

      const hit = hitFromPoint(current.x, current.y);
      if (hit) add(hit.idx);

      lastClient = current;
      updateSvg(current);
    }

    function end(e) {
      if (!drawing || e.pointerId !== activePointerId) return;
      e.preventDefault();

      const current = { x: e.clientX, y: e.clientY };
      if (lastClient) crossedClient(lastClient, current);

      const hit = hitFromPoint(current.x, current.y);
      if (hit) add(hit.idx);

      stopGesture();
      validate();
    }

    function cancel() {
      if (!drawing) return;
      stopGesture();
      reset("Gesto cancelado");
    }

    dots.forEach(dot => {
      dot.addEventListener("pointerdown", e => begin(e, dot), { passive: false });
      dot.addEventListener("dragstart", e => e.preventDefault());
      dot.addEventListener("contextmenu", e => e.preventDefault());
    });

    document.addEventListener("pointermove", move, { passive: false, capture: true });
    document.addEventListener("pointerup", end, { passive: false, capture: true });
    document.addEventListener("pointercancel", cancel, { passive: false, capture: true });

    window.addEventListener("blur", () => {
      if (drawing) reset("Gesto cancelado");
    });

    window.addEventListener("resize", () => updateSvg(lastClient));
    requestAnimationFrame(() => {
      updateSvg();
      syncClear();
    });

    return {
      reset,
      resize: () => updateSvg(lastClient),
      validate,
      getSelected: () => selected.slice()
    };
  }

  // Pattern público com validação remota e entrega dinâmica da galeria protegida
  const mainPattern = createPatternLock({
    root: $("#pattern"),
    canvas: $("#patternCanvas"),
    dotSelector: "[data-dot]",
    minPoints: () => config.access.minPoints || 4,
    feedback: $("#patternFeedback"),
    remoteValidate: true,
    onSuccess: async (selectedPattern) => {
      try {
        const res = await fetch(`${authApiBase()}/api/pattern/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pattern: selectedPattern })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          throw new Error(data.message || "Padrão incorreto");
        }
        attempts = 0;

        // Se o servidor retornou a galeria protegida, atualiza e renderiza
        if (Array.isArray(data.gallery)) {
          config.gallery = data.gallery;
          draft.gallery = clone(data.gallery);
          renderGallery();
        }

        setTimeout(unlock, 250);
      } catch (err) {
        attempts++;
        if (attempts >= (config.access.maxAttempts || 5)) {
          lockedUntil = Date.now() + (config.access.lockSeconds || 15) * 1000;
          attempts = 0;
          countdownLock();
        }
        throw err;
      }
    },
    onError: () => {}
  });

  function countdownLock() {
    const el = $("#patternFeedback"); 
    const tick = () => { 
      const left = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000)); 
      if (!left) return mainPattern.reset("Tente novamente"); 
      if (el) { el.textContent = `Aguarde ${left}s`; el.className = "feedback error"; }
      setTimeout(tick, 500); 
    }; 
    tick();
  }
  $("#clearPattern")?.addEventListener("click", () => { mainPattern.reset("Padrão limpo"); setTimeout(() => mainPattern.reset(), 700); });

  function authApiBase() { const configured = String(config.auth?.apiUrl || "").trim().replace(/\/$/, ""); return configured || window.location.origin; }
  function remoteOtpEnabled() { return true; }
  async function authRequest(path, { method = "POST", token = "", body } = {}) {
    const base = authApiBase();
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store"
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const err = new Error(data.message || `Falha de autenticação (${res.status})`); err.status = res.status; err.data = data; throw err; }
    return data;
  }
  function ownerLocked() { return Date.now() < ownerLockedUntil; }
  function updateOwnerGateAvailability() {
    const locked = ownerLocked(), left = locked ? Math.ceil((ownerLockedUntil - Date.now()) / 1000) : 0;
    const keyBtn = $("#adminKeyContinue");
    if (keyBtn) keyBtn.disabled = locked;
    const sec = $("#ownerSecurityStatus");
    if (sec) sec.textContent = locked ? `Acesso bloqueado por mais ${Math.ceil(left / 60)} min.` : "Proteção: chave privada + código de uso único";
    if (locked && !$("#ownerGate")?.classList.contains("hidden")) setTimeout(updateOwnerGateAvailability, 1000);
  }
  function selectOwnerAuth(method) {
    const keyPane = $("#ownerKeyPane"), otpPane = $("#ownerOtpPane"), hint = $("#ownerStageHint");
    keyPane?.classList.toggle("active", method === "key");
    otpPane?.classList.toggle("active", method === "otp");
    if (hint) hint.textContent = method === "key" ? (ownerLocked() ? "Acesso temporariamente bloqueado." : "Digite sua chave de acesso para continuar.") : "Digite o código enviado ao seu canal privado.";
    if (method === "key") setTimeout(() => $("#adminAccessKey")?.focus(), 70);
    else setTimeout(() => $("#otpInput")?.focus(), 70);
  }
  function setRemoteLock(seconds, message = "Acesso temporariamente bloqueado") {
    ownerLockedUntil = Date.now() + Math.max(1, Number(seconds || 600)) * 1000;
    remoteChallengeToken = ""; remoteAdminSession = ""; sessionStorage.removeItem("xs-v13-admin-session"); clearInterval(otpCountdownTimer);
    const key = $("#adminAccessKey"), input = $("#otpInput");
    if (key) { key.value = ""; key.disabled = false; }
    if (input) { input.value = ""; input.disabled = true; input.classList.remove("is-error", "is-success", "is-verifying"); }
    selectOwnerAuth("key");
    const status = $("#adminKeyStatus"); if (status) { status.textContent = message; status.className = "owner-inline-status error"; }
    updateOwnerGateAvailability();
  }
  function startOtpCountdown(seconds = 30) {
    clearInterval(otpCountdownTimer); let left = Math.max(0, Number(seconds || 30));
    const draw = () => { const el = $("#otpTimer"); if (el) el.textContent = `00:${String(Math.max(0, left)).padStart(2, "0")}`; }; draw();
    otpCountdownTimer = setInterval(() => {
      left--; draw();
      if (left <= 0) {
        clearInterval(otpCountdownTimer); remoteChallengeToken = "";
        const input = $("#otpInput"); if (input) { input.disabled = true; input.value = ""; }
        const otpStatus = $("#otpStatus");
        if (otpStatus) otpStatus.textContent = "Código expirado. Volte e solicite um novo código com sua chave.";
        setTimeout(() => selectOwnerAuth("key"), 1100);
      }
    }, 1000);
  }
  async function refreshAuthHealth() {
    const el = $("#authHealth"); if (!el) return;
    el.className = "auth-health"; el.textContent = "Verificando autenticação…";
    try {
      const res = await fetch(`${authApiBase()}/health`, { cache: "no-store", credentials: "same-origin" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok !== true) throw new Error();
      const ready = data.authReady === true;
      el.className = `auth-health ${ready ? "ok" : "error"}`;
      if (ready) el.textContent = "Autenticação pronta.";
      else if (!data.accessKeyConfigured && (!data.resendConfigured || !data.emailConfigured)) el.textContent = "Configure ADMIN_ACCESS_KEY, RESEND_API_KEY e ADMIN_EMAIL no servidor.";
      else if (!data.accessKeyConfigured) el.textContent = "Configure ADMIN_ACCESS_KEY no servidor.";
      else if (!data.resendConfigured || !data.emailConfigured) el.textContent = "Configure RESEND_API_KEY e ADMIN_EMAIL no servidor.";
      else el.textContent = "Autenticação ainda não está pronta.";
    } catch { el.className = "auth-health error"; el.textContent = "Serviço de autenticação indisponível."; }
  }
  async function showOwnerGate() {
    const gate = $("#ownerGate"); 
    if (!gate) return;
    gate.classList.remove("hidden"); gate.setAttribute("aria-hidden", "false");
    updateOwnerGateAvailability();
    if (remoteOtpEnabled() && remoteAdminSession) {
      try { const restored = await authRequest("/api/admin/session/validate", { token: remoteAdminSession }); setRemoteAdminExpiry(restored.expiresIn || 0); return grantAdmin("Sessão Admin restaurada"); }
      catch { sessionStorage.removeItem("xs-v13-admin-session"); sessionStorage.removeItem("xs-v15-admin-expires-at"); remoteAdminSession = ""; remoteAdminExpiresAt = 0; }
    }
    remoteChallengeToken = ""; clearInterval(otpCountdownTimer);
    const key = $("#adminAccessKey"), otp = $("#otpInput");
    if (key) { key.value = ""; key.disabled = false; }
    if (otp) { otp.value = ""; otp.disabled = true; otp.classList.remove("is-error", "is-success", "is-verifying"); }
    const keyStat = $("#adminKeyStatus"), otpStat = $("#otpStatus");
    if (keyStat) keyStat.textContent = ""; 
    if (otpStat) otpStat.textContent = "Aguardando o código…";
    selectOwnerAuth("key"); refreshAuthHealth();
  }
  function hideOwnerGate() {
    const gate = $("#ownerGate"); 
    if (!gate) return;
    gate.classList.add("hidden"); gate.setAttribute("aria-hidden", "true");
    clearInterval(otpCountdownTimer); remoteChallengeToken = "";
    const key = $("#adminAccessKey"), input = $("#otpInput");
    if (key) key.value = "";
    if (input) { input.value = ""; input.disabled = true; }
  }
  $("#ownerGateClose")?.addEventListener("click", hideOwnerGate);
  $("#toggleAdminKey")?.addEventListener("click", () => {
    const input = $("#adminAccessKey"); 
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password"; 
    input.focus();
  });

  let adminAccessInFlight = false;
  async function submitAdminKey() {
    if (ownerLocked() || adminAccessInFlight) return;
    const input = $("#adminAccessKey"), btn = $("#adminKeyContinue"), status = $("#adminKeyStatus");
    const key = String(input?.value || "").trim();
    if (key.length < 4) { if (status) { status.textContent = "Digite sua chave de acesso."; status.className = "owner-inline-status error"; } input?.focus(); return; }
    adminAccessInFlight = true; if (input) input.disabled = true; if (btn) { btn.disabled = true; btn.textContent = "Autenticando…"; } 
    if (status) { status.textContent = "Validando chave e enviando código…"; status.className = "owner-inline-status"; }
    try {
      const data = await authRequest("/api/admin/access", { body: { key } });
      remoteChallengeToken = data.challengeToken;
      if (input) input.value = "";
      const otp = $("#otpInput"); 
      if (otp) { otp.value = ""; otp.disabled = false; otp.classList.remove("is-error", "is-success", "is-verifying"); }
      const hint = $("#otpAttemptsHint"), st = $("#otpStatus");
      if (hint) hint.textContent = "2 tentativas";
      if (st) st.textContent = "Código enviado. Digite os 6 dígitos para entrar.";
      selectOwnerAuth("otp"); startOtpCountdown(data.expiresIn || 30);
    } catch (err) {
      const d = err.data || {};
      if (input) input.disabled = false;
      if (d.locked || d.retryAfter >= 60) { setRemoteLock(d.retryAfter || 600, "Acesso bloqueado temporariamente."); }
      else {
        if (status) {
          status.textContent = d.mailDeliveryFailed
            ? "Não foi possível enviar o e-mail. Verifique o Resend."
            : (err.status === 502 ? (err.message || "Não foi possível enviar o código.") : (err.message || "Chave inválida."));
          status.className = "owner-inline-status error";
        }
        input?.select(); input?.focus();
      }
    } finally { 
      adminAccessInFlight = false; 
      if (!ownerLocked()) { 
        if (btn) { btn.disabled = false; btn.textContent = "Continuar"; }
        if (input) input.disabled = false; 
      } 
    }
  }
  $("#adminKeyContinue")?.addEventListener("click", submitAdminKey);
  $("#adminAccessKey")?.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); submitAdminKey(); } });
  $("#backToAdminKey")?.addEventListener("click", () => { remoteChallengeToken = ""; clearInterval(otpCountdownTimer); selectOwnerAuth("key"); });

  let otpVerifyInFlight = false;
  async function verifyOtpAuto() {
    if (ownerLocked() || otpVerifyInFlight || !remoteChallengeToken) return;
    const input = $("#otpInput");
    if (!input) return;
    const code = input.value.replace(/\D/g, "").slice(0, 6); 
    if (code.length !== 6) return;
    otpVerifyInFlight = true; input.disabled = true; input.classList.remove("is-error", "is-success"); input.classList.add("is-verifying"); 
    const st = $("#otpStatus"); if (st) st.textContent = "Validando código…";
    try {
      const data = await authRequest("/api/admin/otp/verify", { token: remoteChallengeToken, body: { code } });
      remoteAdminSession = data.sessionToken; sessionStorage.setItem("xs-v13-admin-session", remoteAdminSession); setRemoteAdminExpiry(data.expiresIn || 1800); remoteChallengeToken = ""; clearInterval(otpCountdownTimer);
      input.classList.remove("is-verifying"); input.classList.add("is-success"); if (st) st.textContent = "Autenticação concluída.";
      setTimeout(() => grantAdmin("XS Manager autenticado"), 160);
    } catch (err) {
      const d = err.data || {}; input.classList.remove("is-verifying"); input.value = "";
      if (d.locked || d.restartPattern) {
        input.classList.add("is-error"); setRemoteLock(d.retryAfter || 600, "Duas tentativas incorretas. Aguarde 10 minutos."); toast("Acesso bloqueado por 10 minutos.", "error");
      } else if (d.expired) {
        remoteChallengeToken = ""; input.classList.add("is-error"); input.disabled = true; if (st) st.textContent = "Código expirado. Retornando para a chave…"; setTimeout(() => selectOwnerAuth("key"), 900);
      } else {
        input.classList.add("is-error"); input.disabled = false; 
        const hint = $("#otpAttemptsHint"); if (hint) hint.textContent = `${d.errorsRemaining ?? 1} tentativa restante`; 
        if (st) st.textContent = "Código incorreto.";
        setTimeout(() => { input.classList.remove("is-error"); input.focus(); }, 260);
      }
    } finally { otpVerifyInFlight = false; }
  }
  $("#otpInput")?.addEventListener("input", e => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6); if (e.target.value.length === 6) verifyOtpAuto(); });

  function renderNotifications() {
    const list = config.notifications || [];
    const nList = $("#notificationList"), nDot = $("#notificationDot"), nBtn = $("#notificationBtn");
    if (nList) nList.innerHTML = list.length ? list.map(n => `<div class="notice"><b>${esc(n.title || "Aviso")}</b><span>${esc(n.text || "")}</span></div>`).join("") : `<div class="notice"><span>Nenhum aviso.</span></div>`;
    if (nDot) nDot.style.display = config.modules.notifications !== false && list.some(n => !n.read) ? "" : "none";
    if (nBtn) nBtn.style.display = config.modules.notifications !== false ? "" : "none";
  }
  $("#notificationBtn")?.addEventListener("click", () => { 
    $("#notifPanel")?.classList.toggle("hidden"); 
    config.notifications?.forEach(n => n.read = true); 
    persist(); 
    const dot = $("#notificationDot");
    if (dot) dot.style.display = "none"; 
  });
  $$('[data-close-panel]').forEach(b => b.addEventListener("click", () => $("#" + b.dataset.closePanel)?.classList.add("hidden")));

  function galleryItems(album = lightboxAlbum) { return album === "Todos" ? (config.gallery || []) : (config.gallery || []).filter(g => (g.album || "Destaques") === album); }
  function renderGallery() {
    const albums = ["Todos", ...new Set((config.gallery || []).map(g => g.album || "Destaques"))];
    if (!albums.includes(lightboxAlbum)) lightboxAlbum = "Todos";
    const af = $("#albumFilters");
    if (af) {
      af.innerHTML = albums.map(a => `<button type="button" class="album-chip ${a === lightboxAlbum ? "active" : ""}" data-album="${esc(a)}">${esc(a)}</button>`).join("");
      $$('[data-album]', af).forEach(b => b.addEventListener("click", () => { lightboxAlbum = b.dataset.album; renderGallery(); }));
    }
    const items = galleryItems();
    const gg = $("#galleryGrid");
    if (gg) {
      gg.innerHTML = items.map((g, i) => `<button type="button" class="gallery-item" data-gallery="${i}"><img src="${esc(g.src || "")}" alt="${esc(g.title || `Foto ${i + 1}`)}" loading="lazy"><span>${esc(g.title || `Foto ${i + 1}`)}</span></button>`).join("");
      $$('[data-gallery]', gg).forEach(b => b.addEventListener("click", () => openLightbox(Number(b.dataset.gallery))));
    }
  }
  function openLightbox(i) { lightboxIndex = i; zoom = 1; renderLightbox(); $("#lightbox")?.classList.remove("hidden"); }
  function renderLightbox() { 
    const items = galleryItems(); 
    if (!items.length) return; 
    lightboxIndex = (lightboxIndex + items.length) % items.length; 
    const g = items[lightboxIndex]; 
    const img = $("#lightboxImg"), t = $("#lightboxTitle"), cap = $("#lightboxCaption"), c = $("#lightboxCounter"), zl = $("#zoomLabel");
    if (img) { img.src = g.src || ""; img.style.transform = `scale(${zoom})`; }
    if (t) t.textContent = g.title || `Foto ${lightboxIndex + 1}`; 
    if (cap) cap.textContent = g.caption || ""; 
    if (c) c.textContent = `${lightboxIndex + 1}/${items.length}`; 
    if (zl) zl.textContent = `${Math.round(zoom * 100)}%`; 
  }
  $("#lightboxClose")?.addEventListener("click", () => $("#lightbox")?.classList.add("hidden"));
  $("#lightboxPrev")?.addEventListener("click", () => { lightboxIndex--; zoom = 1; renderLightbox(); });
  $("#lightboxNext")?.addEventListener("click", () => { lightboxIndex++; zoom = 1; renderLightbox(); });
  $("#zoomIn")?.addEventListener("click", () => { zoom = Math.min(2.5, zoom + .2); renderLightbox(); });
  $("#zoomOut")?.addEventListener("click", () => { zoom = Math.max(.6, zoom - .2); renderLightbox(); });

  function renderFriends() { 
    const fg = $("#friendsGrid");
    if (fg) fg.innerHTML = (config.friends || []).map(f => `<a class="friend-card" href="${esc(f.url || `https://xat.me/${f.regname || ""}`)}" target="_blank" rel="noopener noreferrer"><img src="${esc(f.avatar || "")}" alt=""><div><b>@${esc(f.regname || "Sem nome")}</b><small>UID ${esc(f.uid || "—")}</small></div></a>`).join(""); 
  }
  function linkIcon(l) { const u = String(l.url || "").toLowerCase(); if (l.icon && l.icon !== "auto") return l.icon; if (u.includes("youtube")) return "▶"; if (u.includes("instagram")) return "◎"; if (u.includes("discord")) return "◈"; if (u.includes("twitch")) return "◩"; if (u.includes("xat.")) return "✦"; return "↗"; }
  function renderLinks() { 
    const ll = $("#linksList");
    if (ll) ll.innerHTML = (config.links || []).map(l => `<a class="link-card" href="${esc(l.url || "#")}" target="_blank" rel="noopener noreferrer"><span class="link-icon">${esc(linkIcon(l))}</span><b>${esc(l.label || "Link")}</b><span>↗</span></a>`).join(""); 
  }

  function loadTrack(auto = false) {
    const tracks = config.music || [];
    const tTitle = $("#trackTitle"), tArt = $("#trackArtist"), cover = $("#trackCover");
    if (!tracks.length) { 
      if (tTitle) tTitle.textContent = "Sem música"; 
      if (tArt) tArt.textContent = ""; 
      if (audio) audio.removeAttribute("src"); 
      return; 
    }
    trackIndex = (trackIndex + tracks.length) % tracks.length;
    const t = tracks[trackIndex];
    if (tTitle) tTitle.textContent = t.title || `Faixa ${trackIndex + 1}`;
    if (tArt) tArt.textContent = t.artist || "";
    if (cover) {
      cover.textContent = t.cover ? "" : "♫"; 
      cover.style.backgroundImage = t.cover ? `url("${String(t.cover).replace(/"/g, '\\"')}")` : "";
    }
    if (audio && audio.getAttribute("src") !== (t.src || "")) audio.src = t.src || "";
    if (auto && t.src && audio) audio.play().catch(() => {});
    updatePlayerState(); renderTrackList();
  }
  function nextTrack() { const tracks = config.music || []; if (!tracks.length) return; if (config.player.shuffle && tracks.length > 1) { let n = trackIndex; while (n === trackIndex) n = Math.floor(Math.random() * tracks.length); trackIndex = n; } else trackIndex++; loadTrack(true); }
  function prevTrack() { trackIndex--; loadTrack(true); }
  function updatePlayerState() { 
    const pb = $("#playBtn"), sb = $("#shuffleBtn"), rb = $("#repeatBtn");
    if (pb && audio) pb.textContent = audio.paused ? "▶" : "❚❚"; 
    if (sb) sb.classList.toggle("active", !!config.player.shuffle); 
    if (rb) {
      rb.classList.toggle("active", config.player.repeat !== "off"); 
      rb.textContent = config.player.repeat === "one" ? "↻¹" : "↻"; 
    }
    updateNowPlaying(); 
  }
  function renderTrackList() { 
    const tl = $("#trackList");
    if (!tl) return;
    tl.innerHTML = (config.music || []).map((t, i) => `<button type="button" class="track-row ${i === trackIndex ? "active" : ""}" data-track="${i}"><div><b>${esc(t.title || `Faixa ${i + 1}`)}</b><small>${esc(t.artist || "")}</small></div><span>${i === trackIndex && (!audio || !audio.paused) ? "♫" : "▶"}</span></button>`).join(""); 
    $$('[data-track]', tl).forEach(r => r.addEventListener("click", () => { trackIndex = Number(r.dataset.track); loadTrack(true); })); 
  }
  function updateNowPlaying() { 
    const t = (config.music || [])[trackIndex]; 
    const b = $("#nowPlaying"); 
    if (!b) return;
    if (!t || !audio || audio.paused || $("#view-music")?.classList.contains("active")) return b.classList.add("hidden"); 
    b.classList.remove("hidden"); 
    b.classList.add("playing"); 
    const npt = $("#nowPlayingText");
    if (npt) npt.textContent = t.title || "Tocando"; 
  }
  function fmtTime(v) { if (!Number.isFinite(v)) return "0:00"; return `${Math.floor(v / 60)}:${String(Math.floor(v % 60)).padStart(2, "0")}`; }
  
  if (audio) {
    $("#playBtn")?.addEventListener("click", () => { if (!audio.src) return; initAudioAnalyser(); audio.paused ? audio.play().catch(() => {}) : audio.pause(); });
    $("#nextBtn")?.addEventListener("click", nextTrack); 
    $("#prevBtn")?.addEventListener("click", prevTrack);
    $("#shuffleBtn")?.addEventListener("click", () => { config.player.shuffle = !config.player.shuffle; persist(); updatePlayerState(); });
    $("#repeatBtn")?.addEventListener("click", () => { config.player.repeat = config.player.repeat === "all" ? "one" : config.player.repeat === "one" ? "off" : "all"; persist(); updatePlayerState(); });
    $("#volume")?.addEventListener("input", e => { audio.volume = Number(e.target.value); config.player.volume = audio.volume; persist(); });
    $("#progressTrack")?.addEventListener("click", e => {
      if (!audio.duration) return;
      const r = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      audio.currentTime = ratio * audio.duration;
    });
    audio.addEventListener("timeupdate", () => {
      const pct = audio.duration ? audio.currentTime / audio.duration * 100 : 0;
      const pf = $("#progressFill"), pg = $("#progressGlow"), tn = $("#timeNow"), tt = $("#timeTotal");
      if (pf) pf.style.width = `${pct}%`;
      if (pg) pg.style.left = `${pct}%`;
      if (tn) tn.textContent = fmtTime(audio.currentTime);
      if (tt) tt.textContent = fmtTime(audio.duration);
    });
    audio.addEventListener("play", () => { initAudioAnalyser(); updatePlayerState(); drawVisualizer(); }); 
    audio.addEventListener("pause", updatePlayerState);
    audio.addEventListener("ended", () => { if (config.player.repeat === "one") { audio.currentTime = 0; audio.play().catch(() => {}); } else if (config.player.repeat === "all") nextTrack(); else updatePlayerState(); });
  }
  $("#nowPlaying")?.addEventListener("click", () => openView("music"));

  function initAudioAnalyser() {
    if (!config.player.visualizer || analyser || !audio) return;
    try { 
      audioCtx = new (window.AudioContext || window.webkitAudioContext)(); 
      sourceNode = audioCtx.createMediaElementSource(audio); 
      analyser = audioCtx.createAnalyser(); 
      analyser.fftSize = 64; 
      sourceNode.connect(analyser); 
      analyser.connect(audioCtx.destination); 
    } catch { analyser = null; }
  }

  function drawVisualizer() {
    cancelAnimationFrame(visualizerRAF);
    visualizerRAF = 0;

    const canvas = $("#visualizer");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const renderFrame = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const bars = 28;

      if (analyser && audio && !audio.paused) {
        if (!data || data.length !== analyser.frequencyBinCount) {
          data = new Uint8Array(analyser.frequencyBinCount);
        }
        analyser.getByteFrequencyData(data);
      }

      for (let i = 0; i < bars; i++) {
        const val = (data && audio && !audio.paused)
          ? data[i % data.length] / 255
          : (audio && audio.paused ? .08 : .22 + Math.abs(Math.sin(Date.now() / 260 + i)) * .24);
        const bh = Math.max(3, val * h * .9);
        const x = i * (w / bars) + 3;
        const bw = Math.max(3, w / bars - 7);
        const grad = ctx.createLinearGradient(0, h - bh, 0, h);
        grad.addColorStop(0, cachedAccent2);
        grad.addColorStop(1, cachedAccent);
        ctx.fillStyle = grad;
        ctx.globalAlpha = .75;
        ctx.fillRect(x, h - bh, bw, bh);
      }
      ctx.globalAlpha = 1;
    };

    const loop = () => {
      renderFrame();
      const musicVisible = $("#view-music")?.classList.contains("active");
      const shouldAnimate =
        config.player.visualizer !== false &&
        !document.hidden &&
        (audio && !audio.paused || musicVisible);

      visualizerRAF = shouldAnimate ? requestAnimationFrame(loop) : 0;
    };

    loop();
  }

  function field(label, path, value, type = "text", full = false) { return `<div class="field ${full ? "full" : ""}"><label>${label}</label><input data-path="${path}" type="${type}" value="${esc(value ?? "")}"></div>`; }
  function range(label, path, value, min, max, step) { return `<div class="field"><label>${label} <output>${value}</output></label><input data-path="${path}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></div>`; }
  function check(label, path, value) { return `<label class="check-row"><input data-path="${path}" type="checkbox" ${value ? "checked" : ""}><span>${label}</span></label>`; }
  function select(label, path, value, options) { return `<div class="field"><label>${label}</label><select data-path="${path}">${options.map(([v, l]) => `<option value="${esc(v)}" ${String(value) === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>`; }

  function themePreview(v) { return `<span class="theme-preview theme-preview-${v.preview}"><i class="tp-side"></i><i class="tp-hero"></i><i class="tp-card a"></i><i class="tp-card b"></i><i class="tp-dot"></i></span>`; }
  
  function appearanceEditor() {
    const a = draft.appearance;
    return `<section class="theme-picker-block"><div class="theme-picker-head"><div><span class="eyebrow">INTERFACE</span><h3>Layouts completos</h3><p>Cada opção reorganiza navegação, Home e painéis.</p></div><div class="theme-scroll-actions"><button type="button" class="theme-scroll-btn" data-scroll-theme="-1">‹</button><button type="button" class="theme-scroll-btn" data-scroll-theme="1">›</button></div></div><div id="interfaceThemeScroller" class="interface-theme-scroller">${Object.entries(UI_THEMES).map(([k, v]) => `<button type="button" class="interface-theme-card ${a.interfaceTheme === k ? "active" : ""}" data-interface-theme="${k}">${themePreview(v)}<b>${v.label}</b><small>${v.desc}</small><em>${a.interfaceTheme === k ? "Selecionado" : "Usar layout"}</em></button>`).join("")}</div></section>
    <section class="palette-block"><div class="theme-picker-head compact-head"><div><span class="eyebrow">PALETAS</span><h3>Cores prontas</h3></div><div class="theme-scroll-actions"><button type="button" class="theme-scroll-btn" data-scroll-palette="-1">‹</button><button type="button" class="theme-scroll-btn" data-scroll-palette="1">›</button></div></div><div id="paletteScroller" class="palette-scroller">${Object.entries(PRESETS).map(([k, v]) => `<button type="button" class="preset-card ${a.preset === k ? "active" : ""}" data-preset="${k}"><b>${k[0].toUpperCase() + k.slice(1)}</b><small>Paleta</small><span class="swatches"><i style="background:${v.accent}"></i><i style="background:${v.accent2}"></i><i style="background:${v.pageColor}"></i></span></button>`).join("")}<button type="button" class="preset-card ${a.preset === "custom" ? "active" : ""}" data-preset="custom"><b>Custom</b><small>Suas cores</small><span class="swatches custom-swatches"><i></i><i></i><i></i></span></button></div></section>
    <div class="form-grid">
      ${field("Wallpaper desktop (URL)", "appearance.wallpaper", a.wallpaper, "text", true)}
      ${field("Wallpaper mobile (URL)", "appearance.wallpaperMobile", a.wallpaperMobile, "text", true)}
      ${field("Vídeo de fundo MP4/WebM (opcional)", "appearance.backgroundVideo", a.backgroundVideo, "text", true)}
      ${select("Ajuste do wallpaper", "appearance.backgroundSize", a.backgroundSize, [["cover", "Preencher"], ["contain", "Conter"], ["auto", "Original"]])}
      ${field("Posição do wallpaper", "appearance.backgroundPosition", a.backgroundPosition)}
      ${field("Cor da página", "appearance.pageColor", a.pageColor, "color")}${field("Painéis", "appearance.panelColor", a.panelColor, "color")}${field("Navegação", "appearance.sidebarColor", a.sidebarColor, "color")}${field("Texto", "appearance.textColor", a.textColor, "color")}${field("Texto secundário", "appearance.mutedColor", a.mutedColor, "color")}${field("Bordas", "appearance.borderColor", a.borderColor, "color")}${field("Neon principal", "appearance.accent", a.accent, "color")}${field("Neon secundário", "appearance.accent2", a.accent2, "color")}${field("Overlay", "appearance.overlayColor", a.overlayColor, "color")}
      ${range("Overlay", "appearance.overlayOpacity", a.overlayOpacity, 0, .9, .01)}${range("Transparência painel", "appearance.panelOpacity", a.panelOpacity, .08, .95, .01)}${range("Transparência navegação", "appearance.sidebarOpacity", a.sidebarOpacity, .08, .98, .01)}${range("Blur", "appearance.blur", a.blur, 0, 50, 1)}${range("Glow", "appearance.glow", a.glow, 0, 100, 1)}${range("Borda", "appearance.borderOpacity", a.borderOpacity, 0, .5, .01)}${range("Escala da fonte", "appearance.fontScale", a.fontScale, .8, 1.3, .05)}${range("Escala desktop", "appearance.desktopScale", a.desktopScale, .85, 1.1, .01)}${range("Escala mobile", "appearance.mobileScale", a.mobileScale, .85, 1.05, .01)}${range("Largura máxima conteúdo", "appearance.contentMaxWidth", a.contentMaxWidth, 800, 1500, 20)}${range("Tamanho sidebar", "appearance.sidebarSize", a.sidebarSize, 68, 110, 2)}${range("Altura dock mobile", "appearance.mobileDockSize", a.mobileDockSize, 56, 82, 2)}
      ${check("Glow ambiente", "appearance.ambientGlow", a.ambientGlow)}${check("Partículas", "appearance.particles", a.particles)}${check("Parallax do wallpaper", "appearance.parallax", a.parallax)}${check("Tema automático dia/noite", "appearance.autoDayNight", a.autoDayNight)}
      ${select("Paleta diurna", "appearance.dayPreset", a.dayPreset, Object.keys(PRESETS).map(x => [x, x]))}${select("Paleta noturna", "appearance.nightPreset", a.nightPreset, Object.keys(PRESETS).map(x => [x, x]))}
    </div>`;
  }

  function studioEditor() {
    const a = draft.appearance;
    const c = a.customLayout || (a.customLayout = clone(window.CONFIG_BASE.appearance.customLayout));
    return `<section class="studio-intro"><div><span class="eyebrow">XS STUDIO</span><h3>Crie seu próprio layout</h3><p>Monte uma interface autoral sem editar CSS: posição da navegação, formas, cantos, ícones, densidade e largura dos widgets.</p></div><button type="button" id="useStudioLayout" class="accent-btn">Usar layout Studio</button></section>
    <div class="studio-live-preview" data-studio-preview><div class="studio-preview-nav"><i></i><i></i><i></i><i></i></div><div class="studio-preview-hero"><strong>@${esc(draft.profile.regname || "user")}</strong><b>01:04</b><span>Seu layout, do seu jeito.</span></div><div class="studio-preview-card a"></div><div class="studio-preview-card b"></div></div>
    <div class="form-grid studio-controls">
      ${select("Posição da navegação", "appearance.customLayout.navPosition", c.navPosition, [["left","Esquerda"],["right","Direita"],["bottom","Dock inferior"],["top","Barra superior"]])}
      ${select("Estilo da navegação", "appearance.customLayout.navStyle", c.navStyle, [["rail","Trilho"],["dock","Dock"],["tiles","Blocos"],["icons","Somente ícones"]])}
      ${select("Alinhamento da Home", "appearance.customLayout.heroAlign", c.heroAlign, [["center","Centro"],["left","Esquerda"],["right","Direita"]])}
      ${select("Superfície", "appearance.customLayout.surfaceStyle", c.surfaceStyle, [["glass","Glass"],["solid","Sólida"],["outline","Contorno"],["soft","Soft"]])}
      ${select("Densidade", "appearance.customLayout.density", c.density, [["compact","Compacta"],["comfortable","Confortável"],["airy","Espaçosa"]])}
      ${select("Cabeçalho", "appearance.customLayout.headerStyle", c.headerStyle, [["compact","Compacto"],["clean","Limpo"],["floating","Flutuante"]])}
      ${select("Formato dos atalhos", "appearance.customLayout.tileShape", c.tileShape, [["square","Quadrado"],["rounded","Arredondado"],["pill","Pílula"]])}
      ${range("Cantos dos painéis", "appearance.customLayout.cardRadius", c.cardRadius, 0, 38, 1)}
      ${range("Cantos dos botões", "appearance.customLayout.buttonRadius", c.buttonRadius, 0, 24, 1)}
      ${range("Tamanho dos ícones", "appearance.customLayout.iconSize", c.iconSize, 16, 32, 1)}
      ${range("Espessura dos ícones", "appearance.customLayout.iconWeight", c.iconWeight, 1, 2.8, .1)}
      ${check("Mostrar nomes na navegação", "appearance.customLayout.showNavLabels", c.showNavLabels)}
      ${range("Espaço entre caixas", "appearance.customLayout.boxGap", c.boxGap, 4, 28, 1)}
      ${range("Respiro interno dos painéis", "appearance.customLayout.panelPadding", c.panelPadding, 14, 38, 1)}
      ${range("Largura dos widgets", "appearance.customLayout.widgetWidth", c.widgetWidth, 620, 1180, 20)}
      ${range("Sombras", "appearance.customLayout.shadowStrength", c.shadowStrength, 0, 100, 1)}
    </div><div class="studio-tips"><b>Dica profissional:</b> combine o Studio com qualquer paleta da aba Aparência. O layout e as cores são independentes.</div>`;
  }

  function homeEditor() {
    const h = draft.home;
    return `<div class="form-grid">${select("Alinhamento da Home", "home.layout", h.layout, [["center", "Centro"], ["left", "Esquerda"], ["right", "Direita"]])}${select("Saudação", "home.greetingMode", h.greetingMode, [["auto", "Automática por horário"], ["custom", "Personalizada"]])}${field("Saudação personalizada", "home.customGreeting", h.customGreeting, "text", true)}${check("Relógio 24 horas", "home.clock24h", h.clock24h)}${check("Mostrar segundos", "home.showSeconds", h.showSeconds)}</div><div class="theme-picker-head compact-head"><div><span class="eyebrow">MÓDULOS DA HOME</span><h3>Escolha e ordene</h3></div></div><div class="module-order">${(h.modules || []).map((m, i) => `<div class="module-row ${m.enabled === false ? "disabled" : ""}"><span class="drag">≡</span><label><input type="checkbox" data-home-enable="${i}" ${m.enabled !== false ? "checked" : ""}> <b>${HOME_LABELS[m.id] || m.id}</b></label><button type="button" data-home-move="${i}.-1">↑</button><button type="button" data-home-move="${i}.1">↓</button></div>`).join("")}</div><div class="info-card"><b>Home modular:</b> você pode esconder módulos e definir a ordem sem alterar o código.</div>`;
  }

  function motionEditor() { const m = draft.motion; return `<div class="form-grid">${select("Transição entre abas", "motion.transition", m.transition, [["fade", "Fade"], ["slide", "Slide"], ["zoom", "Zoom"], ["scan", "Scan/HUD"]])}${select("Desbloqueio", "motion.unlockAnimation", m.unlockAnimation, [["dissolve", "Dissolver"], ["zoom", "Zoom"], ["scan", "Varredura"], ["soft", "Suave"]])}${select("Abertura dos widgets", "motion.widgetAnimation", m.widgetAnimation, [["float", "Flutuar"], ["clean", "Limpa"], ["pop", "Pop"], ["scan", "Scan"]])}${range("Intensidade", "motion.intensity", m.intensity, .2, 1.4, .05)}${check("Profundidade no hover", "motion.hoverDepth", m.hoverDepth)}${check("Glow acompanhando o cursor", "motion.cursorGlow", m.cursorGlow)}${check("Reduzir movimentos", "motion.reducedMotion", m.reducedMotion)}</div><div class="info-card"><b>Acessibilidade:</b> “Reduzir movimentos” desativa praticamente todas as animações sem remover funcionalidades.</div>`; }

  function generalEditor() { const p = draft.profile, mo = draft.modules; return `<div class="form-grid">${field("Regname", "profile.regname", p.regname)}${field("UID", "profile.uid", p.uid)}${field("Avatar (URL)", "profile.avatar", p.avatar, "text", true)}${field("Status", "profile.status", p.status)}${field("Cor do status", "profile.statusColor", p.statusColor, "color")}${field("Título da página", "profile.pageTitle", p.pageTitle, "text", true)}${field("Link de edição do perfil no xat", "profile.editProfileUrl", p.editProfileUrl, "text", true)}${check("Amigos", "modules.friends", mo.friends)}${check("Galeria", "modules.gallery", mo.gallery)}${check("Música", "modules.music", mo.music)}${check("Links", "modules.links", mo.links)}${check("Notificações", "modules.notifications", mo.notifications)}${check("Modo foco", "modules.focusMode", mo.focusMode)}</div>`; }

  function editorRows(type, rows, columns, addText) { return `<div class="editor-list">${rows}</div><button type="button" class="subtle-btn editor-add" data-add="${type}">+ ${addText}</button>`; }
  function galleryEditor() { return editorRows("gallery", (draft.gallery || []).map((g, i) => `<div class="editor-row cols-5"><input data-path="gallery.${i}.src" value="${esc(g.src || "")}" placeholder="URL"><input data-path="gallery.${i}.title" value="${esc(g.title || "")}" placeholder="Título"><input data-path="gallery.${i}.caption" value="${esc(g.caption || "")}" placeholder="Legenda"><input data-path="gallery.${i}.album" value="${esc(g.album || "Destaques")}" placeholder="Álbum"><button class="row-remove" data-remove="gallery.${i}" type="button">×</button></div>`).join(""), 5, "Adicionar foto"); }
  function musicEditor() { const p = draft.player; return `<div class="form-grid player-admin">${check("Autoplay", "player.autoplay", p.autoplay)}${check("Shuffle", "player.shuffle", p.shuffle)}${check("Visualizador", "player.visualizer", p.visualizer)}${select("Repetição", "player.repeat", p.repeat, [["all", "Playlist"], ["one", "Faixa"], ["off", "Desligado"]])}${range("Volume inicial", "player.volume", p.volume, 0, 1, .01)}</div>${editorRows("music", (draft.music || []).map((m, i) => `<div class="editor-row cols-5"><input data-path="music.${i}.title" value="${esc(m.title || "")}" placeholder="Título"><input data-path="music.${i}.artist" value="${esc(m.artist || "")}" placeholder="Artista"><input data-path="music.${i}.cover" value="${esc(m.cover || "")}" placeholder="Capa URL"><input data-path="music.${i}.src" value="${esc(m.src || "")}" placeholder="MP3/WAV URL"><button class="row-remove" data-remove="music.${i}" type="button">×</button></div>`).join(""), 5, "Adicionar música")}`; }
  function friendsEditor() { return editorRows("friends", (draft.friends || []).map((f, i) => `<div class="editor-row cols-5"><input data-path="friends.${i}.regname" value="${esc(f.regname || "")}" placeholder="Regname"><input data-path="friends.${i}.uid" value="${esc(f.uid || "")}" placeholder="UID"><input data-path="friends.${i}.avatar" value="${esc(f.avatar || "")}" placeholder="Avatar URL"><input data-path="friends.${i}.url" value="${esc(f.url || "")}" placeholder="xat.me"><button class="row-remove" data-remove="friends.${i}" type="button">×</button></div>`).join(""), 5, "Adicionar amigo"); }
  function linksEditor() { return editorRows("links", (draft.links || []).map((l, i) => `<div class="editor-row cols-4"><input data-path="links.${i}.label" value="${esc(l.label || "")}" placeholder="Nome"><input data-path="links.${i}.icon" value="${esc(l.icon || "auto")}" placeholder="auto"><input data-path="links.${i}.url" value="${esc(l.url || "")}" placeholder="URL"><button class="row-remove" data-remove="links.${i}" type="button">×</button></div>`).join(""), 4, "Adicionar link"); }
  function quotesEditor() { const q = draft.quoteSettings; return `<div class="form-grid">${select("Modo", "quoteSettings.mode", q.mode, [["rotate", "Alternar"], ["random", "Aleatória"], ["fixed", "Fixa"]])}${range("Intervalo (s)", "quoteSettings.intervalSeconds", q.intervalSeconds, 3, 120, 1)}</div>${editorRows("quotes", (draft.quotes || []).map((v, i) => `<div class="editor-row"><input data-path="quotes.${i}" value="${esc(v)}" placeholder="Frase"><span class="muted">${i + 1}</span><button class="row-remove" data-remove="quotes.${i}" type="button">×</button></div>`).join(""), 3, "Adicionar frase")}`; }
  function notifEditor() { return editorRows("notifications", (draft.notifications || []).map((n, i) => `<div class="editor-row cols-4"><input data-path="notifications.${i}.title" value="${esc(n.title || "")}" placeholder="Título"><input data-path="notifications.${i}.text" value="${esc(n.text || "")}" placeholder="Texto"><select data-path="notifications.${i}.read"><option value="false" ${!n.read ? "selected" : ""}>Não lida</option><option value="true" ${n.read ? "selected" : ""}>Lida</option></select><button class="row-remove" data-remove="notifications.${i}" type="button">×</button></div>`).join(""), 4, "Adicionar aviso"); }
  function miniPatternMarkup(kind, pattern) { const attr = kind === "owner" ? "data-owner-mini" : "data-mini"; return `<div class="pattern-mini">${Array.from({ length: 9 }, (_, i) => `<button type="button" ${attr}="${i}" class="${pattern.includes(i) ? "selected" : ""}"></button>`).join("")}</div>`; }
  
  function accessEditor() {
    const l = draft.lockAppearance || (draft.lockAppearance = clone(window.CONFIG_BASE.lockAppearance));
    return `<section class="admin-section security-section"><div class="section-title"><span class="eyebrow">SEGURANÇA ADMIN</span><h3>Autenticação do XS Manager</h3><p>A autenticação administrativa usa chave privada e código temporário enviado por e-mail.</p></div>
      <div class="security-methods">
        <div class="security-card"><span class="security-icon">⌁</span><div><b>Chave privada</b><small>Variável ADMIN_ACCESS_KEY · somente servidor</small></div></div>
        <div class="security-card"><span class="security-icon">#</span><div><b>Código de uso único</b><small>E-mail via Resend · 6 dígitos · 30 segundos</small></div></div>
        <div class="security-card"><span class="security-icon">✓</span><div><b>Proteção contra tentativas</b><small>2 erros de OTP → bloqueio de 10 minutos</small></div></div>
      </div>
      <div class="form-grid security-grid">${field("Endpoint da API (vazio = mesmo domínio)", "auth.apiUrl", draft.auth?.apiUrl || "", "text", true)}${field("Bloqueio por inatividade (minutos)", "owner.sessionMinutes", draft.owner.sessionMinutes, "number")}${check("Bloquear Admin ao ocultar/alternar a aba", "owner.lockOnHidden", draft.owner.lockOnHidden)}</div>
      <div class="info-card"><b>Como trocar sua chave:</b> altere <b>ADMIN_ACCESS_KEY</b> em Environment Variables no painel e reinicie o serviço. A chave nunca é gravada neste perfil, no localStorage ou no GitHub.</div>
    </section>
    <section class="admin-section"><div class="section-title"><span class="eyebrow">ACESSO PÚBLICO</span><h3>Padrão do visitante</h3></div><div class="access-editor"><div>${check("Exigir padrão para entrar", "access.enabled", draft.access.enabled)}${miniPatternMarkup("public", draft.access.pattern)}<div class="head-actions"><button id="clearMini" class="small-btn" type="button">Limpar</button><span id="miniText" class="muted">${draft.access.pattern.join(" → ")}</span></div></div><div><span class="eyebrow">ADMIN</span><h3>Fluxo protegido</h3><div class="info-card">Chave privada → código por e-mail → 6 dígitos → XS Manager.</div></div></div><div class="form-grid">${field("Mínimo público", "access.minPoints", draft.access.minPoints, "number")}${field("Tentativas", "access.maxAttempts", draft.access.maxAttempts, "number")}${field("Bloqueio público (segundos)", "access.lockSeconds", draft.access.lockSeconds, "number")}</div></section>
    <section class="admin-section lock-designer"><div class="section-title"><span class="eyebrow">TELA DE ENTRADA</span><h3>Design do Pattern público</h3><p>Personalize a primeira tela sem alterar o visual do perfil.</p></div>
      <div class="lock-theme-grid">${[["orbital","Orbital"],["minimal","Minimal"],["glass","Glass"],["cyber","Cyber"],["split","Split"]].map(([k,n])=>`<button class="lock-theme-card ${l.theme===k?"active":""}" type="button" data-lock-theme="${k}"><i class="lock-theme-preview ${k}"></i><b>${n}</b></button>`).join("")}</div>
      <div class="form-grid">${field("Título", "lockAppearance.title", l.title, "text", true)}${field("Subtítulo", "lockAppearance.subtitle", l.subtitle, "text", true)}${field("Texto superior", "lockAppearance.kicker", l.kicker)}${field("Wallpaper da entrada (URL)", "lockAppearance.wallpaper", l.wallpaper, "text", true)}${field("Cor de fundo", "lockAppearance.pageColor", l.pageColor, "color")}${field("Texto", "lockAppearance.textColor", l.textColor, "color")}${field("Texto secundário", "lockAppearance.mutedColor", l.mutedColor, "color")}${field("Neon principal", "lockAppearance.accent", l.accent, "color")}${field("Neon secundário", "lockAppearance.accent2", l.accent2, "color")}${field("Overlay", "lockAppearance.overlayColor", l.overlayColor, "color")}${select("Estilo dos pontos", "lockAppearance.dotStyle", l.dotStyle, [["ring","Anel"],["solid","Sólido"],["diamond","Diamante"],["minimal","Minimal"]])}${range("Overlay", "lockAppearance.overlayOpacity", l.overlayOpacity, 0, .9, .01)}${range("Glow", "lockAppearance.glow", l.glow, 0, 100, 1)}${range("Tamanho do Pattern", "lockAppearance.patternSize", l.patternSize, 220, 390, 5)}${check("Mostrar PRIVATE SPACE", "lockAppearance.showKicker", l.showKicker)}${check("Mostrar botão Limpar", "lockAppearance.showClear", l.showClear)}</div>
      <div class="info-card"><b>Separação de segurança:</b> o Pattern público é apenas a entrada visual do perfil. A autenticação do XS Manager acontece exclusivamente no backend privado.</div>
    </section>`;
  }

  function loadProfiles() { try { const raw = storageGet(PROFILES_STORE) || storageGet(LEGACY_PROFILES_STORE) || "{}"; const data = JSON.parse(raw); if (!storageGet(PROFILES_STORE) && raw !== "{}") storageSet(PROFILES_STORE, JSON.stringify(data)); return data; } catch { return {}; } }
  function saveProfiles(p) { storageSet(PROFILES_STORE, JSON.stringify(p)); }
  function profilesEditor() {
    const profiles = loadProfiles(), active = storageGet(ACTIVE_PROFILE) || storageGet(LEGACY_ACTIVE_PROFILE) || "Principal";
    const customCards = Object.entries(profiles).map(([name, c]) => `<article class="profile-card-shell ${active === name ? "active" : ""}"><button type="button" class="profile-card-main" data-profile="${esc(name)}"><span class="profile-avatar-mini"></span><div><b>${esc(name)}</b><span>@${esc(c.profile?.regname || "user")}</span><em>${active === name ? "Em edição" : "Abrir perfil"}</em></div></button><button type="button" class="profile-delete" data-delete-profile="${esc(name)}" title="Remover perfil" aria-label="Remover ${esc(name)}">×</button></article>`).join("");
    return `<div class="profile-manager-head"><div><span class="eyebrow">PERFIS / TEMPLATES</span><h3>Gerenciador de perfis</h3><p class="muted">Crie, duplique, edite, exporte ou remova configurações independentes.</p></div><div class="head-actions"><button id="newProfile" class="small-btn" type="button">+ Novo perfil</button><button id="duplicateProfile" class="small-btn" type="button">Duplicar atual</button><button id="exportProfile" class="small-btn" type="button">Exportar JSON</button><label class="small-btn file-label">Importar JSON<input id="importProfile" type="file" accept="application/json,.json" hidden></label></div></div><div class="profiles-grid"><article class="profile-card-shell principal ${active === "Principal" ? "active" : ""}"><button type="button" class="profile-card-main" data-profile="Principal"><span class="profile-avatar-mini"></span><div><b>Principal</b><span>@${esc(config.profile.regname)}</span><em>${active === "Principal" ? "Em edição" : "Abrir perfil"}</em></div></button><span class="profile-protected" title="Perfil base protegido">Base</span></article>${customCards}</div><div class="info-card"><b>Exclusão segura:</b> o perfil Principal não pode ser apagado. Ao excluir um perfil local, a ação remove apenas os dados salvos neste navegador.</div>`;
  }

  function setPath(obj, path, value) { const parts = path.split("."); let cur = obj; for (const p of parts.slice(0, -1)) cur = cur[p]; cur[parts.at(-1)] = value; }
  function removePath(obj, path) { const parts = path.split("."); const i = Number(parts.pop()); let cur = obj; for (const p of parts) cur = cur[p]; cur.splice(i, 1); }
  function moveArray(arr, from, to) { if (to < 0 || to >= arr.length) return; const [x] = arr.splice(from, 1); arr.splice(to, 0, x); }

  function hasUnsavedChanges() {
    try { return JSON.stringify(migrate(clone(draft))) !== JSON.stringify(migrate(clone(config))); }
    catch { return false; }
  }

  function updateSettingsSaveState() {
    const dirty = hasUnsavedChanges();
    const hint = $("#settingsHint"), dot = $("#settingsDirtyDot");
    const save = $("#saveSettings"), undo = $("#resetDraft");

    if (hint) hint.textContent = dirty ? "Alterações não salvas" : "Todas as alterações estão salvas";
    if (dot) dot.classList.toggle("dirty", dirty);
    if (save) {
      save.disabled = !dirty;
      save.classList.toggle("is-ready", dirty);
    }
    if (undo) undo.disabled = !dirty;
  }

  function renderSettings() {
    const content = $("#settingsContent");
    if (!content) return;
    $$("#settingsTabs [data-tab]").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === settingsTab));
    const editors = {
      appearance: appearanceEditor, studio: studioEditor, home: homeEditor, motion: motionEditor, general: generalEditor,
      gallery: galleryEditor, music: musicEditor, friends: friendsEditor, links: linksEditor, quotes: quotesEditor,
      notifications: notifEditor, access: accessEditor, profiles: profilesEditor
    };
    const editor = editors[settingsTab] || appearanceEditor;
    content.innerHTML = editor();
    bindSettings();
    updateSettingsSaveState();
    updateAdminSessionStatus();
  }

  function bindSettings() {
    const content = $("#settingsContent");
    if (!content) return;

    $$('[data-path]', content).forEach(i => {
      const event = i.type === "checkbox" || i.tagName === "SELECT" ? "change" : "input";
      i.addEventListener(event, () => {
        let val = i.type === "number" || i.type === "range" ? Number(i.value) : i.type === "checkbox" ? i.checked : i.value;
        if (i.dataset.path?.endsWith(".read")) val = i.value === "true";
        setPath(draft, i.dataset.path, val);
        if (i.nextElementSibling?.tagName === "OUTPUT") i.nextElementSibling.value = val;
        if (["appearance", "studio", "motion"].includes(settingsTab)) applyTheme(draft);
        if (settingsTab === "home") { const old = config; config = draft; renderHome(); config = old; }
        if (settingsTab === "access") applyLockTheme(draft);
        updateSettingsSaveState();
      });
    });

    $$('[data-remove]', content).forEach(b => b.addEventListener("click", () => { removePath(draft, b.dataset.remove); renderSettings(); }));
    $$('[data-add]', content).forEach(b => b.addEventListener("click", () => { 
      const t = b.dataset.add; 
      if (t === "gallery") draft.gallery.push({ src: "", title: "Nova foto", caption: "", album: "Destaques" }); 
      if (t === "quotes") draft.quotes.push(""); 
      if (t === "music") draft.music.push({ title: "", artist: "", cover: "", src: "" }); 
      if (t === "friends") draft.friends.push({ regname: "", uid: "", avatar: "", url: "" }); 
      if (t === "links") draft.links.push({ label: "", icon: "auto", url: "" }); 
      if (t === "notifications") draft.notifications.push({ title: "Aviso", text: "", read: false }); 
      renderSettings(); 
    }));
    
    $$('[data-preset]', content).forEach(b => b.addEventListener("click", () => { const k = b.dataset.preset; draft.appearance.preset = k; if (k !== "custom") Object.assign(draft.appearance, PRESETS[k]); applyTheme(draft); renderSettings(); }));
    $$('[data-interface-theme]', content).forEach(b => b.addEventListener("click", () => {
      draft.appearance.interfaceTheme = b.dataset.interfaceTheme;
      applyTheme(draft);
      $$('[data-interface-theme]', content).forEach(card => {
        const active = card.dataset.interfaceTheme === draft.appearance.interfaceTheme;
        card.classList.toggle("active", active);
        const label = card.querySelector("em");
        if (label) label.textContent = active ? "Selecionado" : "Usar layout";
      });
      updateSettingsSaveState();
    }));

    $$('[data-scroll-theme]', content).forEach(b => b.addEventListener("click", () => $("#interfaceThemeScroller")?.scrollBy({ left: Number(b.dataset.scrollTheme) * 380, behavior: "smooth" })));
    $$('[data-scroll-palette]', content).forEach(b => b.addEventListener("click", () => $("#paletteScroller")?.scrollBy({ left: Number(b.dataset.scrollPalette) * 300, behavior: "smooth" })));
    
    $("#useStudioLayout")?.addEventListener("click", () => { draft.appearance.interfaceTheme = "custom"; applyTheme(draft); renderSettings(); toast("Layout Studio ativado"); });
    $$('[data-home-enable]', content).forEach(i => i.addEventListener("change", () => { draft.home.modules[Number(i.dataset.homeEnable)].enabled = i.checked; renderSettings(); const old = config; config = draft; renderHome(); config = old; }));
    $$('[data-home-move]', content).forEach(b => b.addEventListener("click", () => { const [i, d] = b.dataset.homeMove.split(".").map(Number); moveArray(draft.home.modules, i, i + d); renderSettings(); }));
    $$('[data-mini]', content).forEach(b => b.addEventListener("click", () => { const i = Number(b.dataset.mini); if (!draft.access.pattern.includes(i)) draft.access.pattern.push(i); b.classList.add("selected"); const mt = $("#miniText"); if (mt) mt.textContent = draft.access.pattern.join(" → "); }));
    $("#clearMini")?.addEventListener("click", () => { draft.access.pattern = []; renderSettings(); });
    $$('[data-lock-theme]', content).forEach(b => b.addEventListener("click", () => { draft.lockAppearance.theme = b.dataset.lockTheme; applyLockTheme(draft); renderSettings(); }));
    
    bindProfileManager();
  }

  function bindProfileManager() {
    const content = $("#settingsContent");
    if (!content) return;
    $$('[data-profile]', content).forEach(b => b.addEventListener("click", () => { 
      const name = b.dataset.profile; 
      if (name === "Principal") { 
        storageRemove(ACTIVE_PROFILE); 
        config = migrate(window.CONFIG_BASE); 
        const saved = storageGet(STORE); 
        if (saved) config = migrate(JSON.parse(saved)); 
      } else { 
        const profiles = loadProfiles(); 
        if (profiles[name]) { 
          config = migrate(profiles[name]); 
          storageSet(ACTIVE_PROFILE, name); 
        } 
      } 
      draft = clone(config); 
      renderAll(); 
      openView("settings"); 
      settingsTab = "profiles"; 
      renderSettings(); 
      toast(`Perfil ${name} carregado`); 
    }));
    
    $$('[data-delete-profile]', content).forEach(b => b.addEventListener("click", async e => { 
      e.stopPropagation(); 
      const name = b.dataset.deleteProfile; 
      if (!name) return; 
      const ok = await showAdminModal({ title: `Remover ${name}?`, text: "Esta ação apaga os dados locais desse perfil neste navegador. O perfil Principal nunca é removido.", confirmText: "Remover perfil", danger: true }); 
      if (!ok) return; 
      const profiles = loadProfiles(); 
      delete profiles[name]; 
      saveProfiles(profiles); 
      const active = storageGet(ACTIVE_PROFILE); 
      if (active === name) { 
        storageRemove(ACTIVE_PROFILE); 
        config = loadConfig(); 
        draft = clone(config); 
        renderAll(); 
      } 
      renderSettings(); 
      toast(`Perfil ${name} removido`); 
    }));

    $("#newProfile")?.addEventListener("click", async () => { 
      const values = await showAdminModal({ title: "Novo perfil", text: "Crie uma configuração independente a partir da base padrão.", confirmText: "Criar perfil", fields: [{ label: "Nome do perfil", placeholder: "Ex.: Maria" }] }); 
      const name = values?.[0]?.trim(); 
      if (!name) return; 
      const profiles = loadProfiles(); 
      if (profiles[name] || name === "Principal") return toast("Já existe um perfil com esse nome", "error"); 
      profiles[name] = migrate(window.CONFIG_BASE); 
      profiles[name].profile.regname = name; 
      saveProfiles(profiles); 
      renderSettings(); 
      toast(`Perfil ${name} criado`); 
    });

    $("#duplicateProfile")?.addEventListener("click", async () => { 
      const values = await showAdminModal({ title: "Duplicar perfil", text: "Cria uma cópia completa do perfil atual para você personalizar separadamente.", confirmText: "Duplicar", fields: [{ label: "Nome da cópia", placeholder: "Ex.: Modelo Neon 02" }] }); 
      const name = values?.[0]?.trim(); 
      if (!name) return; 
      const profiles = loadProfiles(); 
      if (profiles[name] || name === "Principal") return toast("Já existe um perfil com esse nome", "error"); 
      profiles[name] = clone(config); 
      saveProfiles(profiles); 
      renderSettings(); 
      toast("Perfil duplicado"); 
    });

    $("#exportProfile")?.addEventListener("click", () => downloadJSON(config, `${config.profile.regname || "perfil"}-xs.json`));
    $("#importProfile")?.addEventListener("change", async e => { 
      const f = e.target.files?.[0]; 
      if (!f) return; 
      try { 
        const incoming = migrate(JSON.parse(await f.text())); 
        config = incoming; 
        draft = clone(config); 
        persist(); 
        renderAll(); 
        renderSettings(); 
        toast("Perfil importado"); 
      } catch { toast("JSON inválido", "error"); } 
      e.target.value = ""; 
    });
  }

  function downloadJSON(data, name) { 
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); 
    const url = URL.createObjectURL(blob); 
    const a = document.createElement("a"); 
    a.href = url; 
    a.download = name; 
    a.click(); 
    URL.revokeObjectURL(url); 
  }

  $("#saveSettings")?.addEventListener("click", async () => {
    if (draft.access.enabled && draft.access.pattern.length < Math.max(1, draft.access.minPoints || 4)) return toast("Padrão público muito curto", "error");
    config = migrate(clone(draft)); 
    persist();
    
    if (remoteAdminSession && authApiBase()) {
      try {
        await authRequest("/api/config", {
          token: remoteAdminSession,
          body: config
        });
      } catch (err) {
        console.warn("[XS Cloud] Erro ao sincronizar com o servidor:", err.message);
      }
    }

    const active = storageGet(ACTIVE_PROFILE); 
    if (active) { const profiles = loadProfiles(); profiles[active] = clone(config); saveProfiles(profiles); }
    renderAll(); 
    openView("settings"); 
    adminSessionTouch(); 
    updateSettingsSaveState(); 
    toast("Alterações salvas com sucesso");
  });

  $("#resetDraft")?.addEventListener("click", () => { 
    draft = clone(config); 
    applyTheme(config); 
    applyLockTheme(config); 
    renderSettings(); 
    updateSettingsSaveState(); 
    toast("Alterações descartadas"); 
  });

  document.addEventListener("click", event => {
    const trigger = event.target.closest?.("#settingsClose, #settingsHome");
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    minimizeManagerToHome();
  }, true);

  $("#settingsTabs")?.addEventListener("click", e => { 
    const b = e.target.closest("[data-tab]"); 
    if (!b) return; 
    settingsTab = b.dataset.tab; 
    renderSettings(); 
  });

  function setPreview(mode) { 
    document.documentElement.dataset.previewMode = mode; 
    ["Auto", "Desktop", "Mobile"].forEach(x => $(`#preview${x}`)?.classList.toggle("active", x.toLowerCase() === mode)); 
  }
  $("#previewAuto")?.addEventListener("click", () => setPreview("auto")); 
  $("#previewDesktop")?.addEventListener("click", () => setPreview("desktop")); 
  $("#previewMobile")?.addEventListener("click", () => setPreview("mobile"));

  $$('[data-close-view]').forEach(b => b.addEventListener("click", closeToHome));
  $("#focusBtn")?.addEventListener("click", () => { 
    if (config.modules.focusMode === false) return; 
    document.body.classList.toggle("focus-mode"); 
    $("#focusBtn")?.classList.toggle("active", document.body.classList.contains("focus-mode")); 
  });

  document.addEventListener("pointerdown", () => { if (ownerAuthenticated) adminSessionTouch(); }, { passive: true });
  document.addEventListener("keydown", () => { if (ownerAuthenticated) adminSessionTouch(); }, { passive: true });
  document.addEventListener("visibilitychange", () => { 
    if (document.hidden && ownerAuthenticated && config.owner.lockOnHidden) lockAdmin("Admin bloqueado ao sair da aba"); 
  });

  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (!$("#lightbox")?.classList.contains("hidden")) return $("#lightbox")?.classList.add("hidden");
    if (!$("#ownerGate")?.classList.contains("hidden")) return hideOwnerGate();
    if (!$("#notifPanel")?.classList.contains("hidden")) return $("#notifPanel")?.classList.add("hidden");
    if ($("#view-settings")?.classList.contains("active")) return minimizeManagerToHome();
    if (app.classList.contains("unlocked")) closeToHome();
  });

  let pointerFxRAF = 0;
  let pointerFxX = innerWidth / 2;
  let pointerFxY = innerHeight / 2;

  document.addEventListener("pointermove", e => {
    pointerFxX = e.clientX;
    pointerFxY = e.clientY;
    if (pointerFxRAF) return;

    pointerFxRAF = requestAnimationFrame(() => {
      pointerFxRAF = 0;
      const g = $("#cursorGlow");
      if (g) g.style.transform = `translate(${pointerFxX - 110}px,${pointerFxY - 110}px)`;

      if (!config.appearance.parallax || config.motion.reducedMotion || matchMedia("(max-width:580px)").matches) return;
      const wallpaper = $("#wallpaper");
      if (!wallpaper) return;

      const dx = (pointerFxX / innerWidth - .5) * 10;
      const dy = (pointerFxY / innerHeight - .5) * 10;
      wallpaper.style.transform = `scale(1.035) translate(${dx}px,${dy}px)`;
    });
  }, { passive: true });

  document.addEventListener("pointerleave", () => { 
    const wp = $("#wallpaper");
    if (wp) wp.style.transform = "scale(1.035)"; 
  });

  function renderAll() {
    applyTheme(); 
    applyLockTheme(); 
    renderIdentity(); 
    buildNav(); 
    renderHome(); 
    renderFriends(); 
    renderGallery(); 
    renderLinks(); 
    renderNotifications();
    if (audio) {
      audio.volume = Number(config.player.volume ?? .7); 
      const vol = $("#volume");
      if (vol) vol.value = audio.volume; 
      loadTrack(false); 
    }
    restartQuoteTimer(); 
    updateClock();
    const fb = $("#focusBtn");
    if (fb) fb.style.display = config.modules.focusMode !== false ? "" : "none";
    if (config.access.enabled === false && app.classList.contains("locked")) unlock();
  }

  async function syncServerConfig() {
    try {
      const res = await fetch(`${authApiBase()}/api/config`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (data.ok && data.config && Object.keys(data.config).length > 0) {
        config = migrate(data.config);
        draft = clone(config);
        persist();
        renderAll();
      }
    } catch (err) {
      console.warn("[XS Cloud] Não foi possível carregar config remota:", err.message);
    }
  }

  setInterval(updateClock, 1000);
  setInterval(() => { if (config.appearance.autoDayNight) applyTheme(); }, 60000);
  window.addEventListener("resize", () => applyTheme());

  renderAll(); 
  syncServerConfig();
  drawVisualizer();
})();
