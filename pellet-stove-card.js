{ // bloc isolé : aucune variable ne fuit vers les autres cartes
/*
 * Pellet Stove Card (FR)
 * Carte Home Assistant pour poêle à granulés : dessin animé (flamme), température,
 * consigne réglable, marche/arrêt, capteurs associés (fumées, air, granulés...).
 * Style verre, thème clair/sombre automatique, éditeur visuel.
 * Fonctionne avec n'importe quelle entité « climate ».
 */

const CARD_VERSION = "1.1.1";

/* === NUANCE COMMUNE v2 (cartes Johan854) ===
 * Bloc identique dans toutes les cartes. Options : nuance, nuance_perso, intensite.
 * nuance "theme" (par défaut) : suit la variable carte-nuance du thème Home Assistant ;
 * si elle n'existe pas, la carte garde ses couleurs d'origine. Intensité : 0 = neutre, 1 = normal, 2 = très coloré. */
const GV_NUANCES = [["braise", "Braise (rouge)", "#e0524f"], ["ocean", "Océan (bleu)", "#2f8fd8"], ["lagon", "Lagon (turquoise)", "#1fb5a8"], ["foret", "Forêt (vert)", "#3fae5a"], ["lavande", "Lavande (violet)", "#8a63d8"], ["framboise", "Framboise (rose)", "#e05597"], ["ambre", "Ambre (orange)", "#e8902c"], ["ardoise", "Ardoise (neutre)", "#7d8595"]];
const GV_DEFAULTS = { nuance: "theme", intensite: 1 };
const gvAccent = (c) => {
  const p = c && c.nuance_perso;
  if (c && c.nuance === "perso") {
    if (Array.isArray(p) && p.length === 3) return "#" + p.map((v) => Math.max(0, Math.min(255, Math.round(+v || 0))).toString(16).padStart(2, "0")).join("");
    if (typeof p === "string" && /^#?[0-9a-f]{6}$/i.test(p.trim())) return "#" + p.trim().replace("#", "");
  }
  const n = GV_NUANCES.find((x) => x[0] === (c && c.nuance));
  return n ? n[2] : "var(--carte-nuance)";
};
/* Variables posées sur <ha-card> : --g-bg-x (fond dégradé teinté) et --acc-ui-x (couleur d'accent).
 * Sans nuance (thème sans carte-nuance), elles sont invalides : chaque carte retombe alors sur ses couleurs d'origine. */
const gvStyle = (c, dark) => {
  const i = Number(c && c.intensite), ai = Number.isFinite(i) ? Math.max(0, Math.min(2, i)) : 1;
  const m = (pct, base) => `color-mix(in srgb,var(--acc-ui) ${+(pct * ai).toFixed(1)}%,${base})`;
  const bg = dark ? `linear-gradient(160deg,${m(5, "#1b1e32")} 0%,${m(11, "#1f1b2c")} 55%,${m(22, "#1c1620")} 100%)`
    : `linear-gradient(160deg,${m(2, "#f8f9fd")} 0%,${m(5, "#eef1f8")} 55%,${m(11, "#f8f8fa")} 100%)`;
  return `--acc-ui:${gvAccent(c)};--g-bg-x:${bg};--acc-ui-x:color-mix(in srgb,var(--acc-ui) ${dark ? "80%,#fff" : "82%,#000"})`;
};
const GV_FIELDS = [
  { name: "nuance", selector: { select: { mode: "dropdown", options: [{ value: "theme", label: "Selon le thème (couleurs d'origine)" }, ...GV_NUANCES.map((n) => ({ value: n[0], label: n[1] })), { value: "perso", label: "Personnalisée" }] } } },
  { name: "nuance_perso", selector: { color_rgb: {} } },
  { name: "intensite", selector: { number: { min: 0, max: 2, step: 0.1, mode: "slider" } } }];
const GV_LABELS = { nuance: "Nuance de couleur", nuance_perso: "Couleur personnalisée (nuance « Personnalisée »)", intensite: "Intensité de la nuance" };
/* === FIN NUANCE COMMUNE === */

const DEFAULTS = {
  name: "",
  theme: "auto", nuance: "theme", intensite: 1, // auto (suit Home Assistant), light, dark
  image: "", // photo du poêle (facultatif), ex. /local/poele.png
  image_mode: "background", // background : photo en fond + dessin animé | replace : la photo remplace le dessin
  image_opacity: 0.35,
  status_entity: "", // entité dont l'état (en anglais) est traduit en français, ex. sensor.poele_status
  status_map: {}, // traductions personnalisées : { "load pellet": "Chargement pellet" }
  power_entity: "", // input_number / number de puissance (1 à 5)
  power_min: 1,
  power_max: 5,
  info_entities: [],
  pellet_entity: "",
  temp_step: 0, // 0 = automatique (attribut target_temp_step, sinon 0,5)
  show_controls: true,
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const isNum = (v) => v !== undefined && v !== null && v !== "" && !isNaN(Number(v));
const bad = (st) => !st || st.state === "unavailable" || st.state === "unknown";

const ICONS = {
  temperature: "mdi:thermometer", humidity: "mdi:water-percent", battery: "mdi:battery",
  power: "mdi:flash", pressure: "mdi:gauge", duration: "mdi:timer-outline",
};

/* Traduction des statuts : [libellé, ton] — ton : off | fire | ok | warn | err */
const STATUS_FR = {
  "off": ["Éteint", "off"], "stop": ["Arrêt", "off"], "stopped": ["Arrêt", "off"], "standby": ["Veille", "ok"], "stand by": ["Veille", "ok"],
  "idle": ["En attente", "ok"], "wait": ["Attente", "ok"], "waiting": ["Attente", "ok"], "on": ["Allumé", "fire"],
  "start": ["Démarrage", "fire"], "starting": ["Démarrage", "fire"], "startup": ["Démarrage", "fire"], "start up": ["Démarrage", "fire"],
  "flame light": ["Flamme allumée", "fire"], "flame lit": ["Flamme allumée", "fire"], "flame on": ["Flamme allumée", "fire"],
  "cleaning final": ["Nettoyage final", "warn"], "final cleaning": ["Nettoyage final", "warn"], "cleaning start": ["Nettoyage initial", "fire"], "start cleaning": ["Nettoyage initial", "fire"], "cleaning start up": ["Nettoyage initial", "fire"],
  "off timer": ["Éteint (programmation)", "off"], "check up": ["Vérification", "fire"], "wait flame": ["Attente de flamme", "fire"],
  "ignition": ["Allumage", "fire"], "igniting": ["Allumage", "fire"], "ignite": ["Allumage", "fire"], "fire up": ["Allumage", "fire"], "test fire": ["Test d'allumage", "fire"],
  "load pellet": ["Chargement pellet", "fire"], "loading pellet": ["Chargement pellet", "fire"], "loading pellets": ["Chargement pellet", "fire"], "load pellets": ["Chargement pellet", "fire"], "fueling": ["Chargement pellet", "fire"],
  "heatup": ["Montée en température", "fire"], "heat up": ["Montée en température", "fire"], "warming up": ["Montée en température", "fire"], "preheating": ["Préchauffage", "fire"],
  "work": ["Travail", "fire"], "working": ["Travail", "fire"], "run": ["Travail", "fire"], "running": ["Travail", "fire"], "burning": ["Combustion", "fire"], "burn": ["Combustion", "fire"], "heating": ["En chauffe", "fire"],
  "modulation": ["Modulation", "fire"], "modulating": ["Modulation", "fire"], "burning mod": ["Combustion modulée", "fire"], "eco": ["Éco", "ok"], "ecomode": ["Éco", "ok"], "eco mode": ["Éco", "ok"],
  "ext": ["Extinction", "warn"], "extinguish": ["Extinction", "warn"], "extinguishing": ["Extinction", "warn"], "extinction": ["Extinction", "warn"], "fire stop": ["Extinction", "warn"], "shutdown": ["Extinction", "warn"], "shutting down": ["Extinction", "warn"],
  "clean": ["Nettoyage", "warn"], "cleaning": ["Nettoyage", "warn"], "clean fire": ["Nettoyage du foyer", "warn"], "cleanup": ["Nettoyage final", "warn"], "clean up": ["Nettoyage final", "warn"],
  "cool": ["Refroidissement", "warn"], "cooling": ["Refroidissement", "warn"], "cooling down": ["Refroidissement", "warn"], "cool fluid": ["Refroidissement", "warn"],
  "fan": ["Ventilation", "ok"], "fan only": ["Ventilation", "ok"], "ventilation": ["Ventilation", "ok"],
  "error": ["Erreur", "err"], "fault": ["Défaut", "err"], "alarm": ["Alarme", "err"], "alert": ["Alerte", "err"], "failure": ["Panne", "err"], "no pellet": ["Plus de granulés", "err"], "out of pellets": ["Plus de granulés", "err"],
  "chimney alarm": ["Alarme conduit", "err"], "unavailable": ["Indisponible", "off"], "unknown": ["Inconnu", "off"],
};
const normStatus = (v) => String(v ?? "").trim().toLowerCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " ");

function translateStatus(raw, custom) {
  const k = normStatus(raw);
  if (custom) {
    for (const [ck, cv] of Object.entries(custom)) {
      if (normStatus(ck) === k) { const base = STATUS_FR[k]; return { label: String(cv), tone: base ? base[1] : "ok" }; }
    }
  }
  const t = STATUS_FR[k];
  if (t) return { label: t[0], tone: t[1] };
  const nice = String(raw ?? "").replace(/[_]+/g, " ").trim();
  return { label: nice ? nice.charAt(0).toUpperCase() + nice.slice(1) : "—", tone: "ok" };
}

function stoveState(st) {
  if (bad(st)) return { key: "off", label: "Indisponible", on: false, unknown: true };
  const s = st.state;
  const act = st.attributes && st.attributes.hvac_action;
  if (s === "off" || act === "off") return { key: "off", label: "Éteint", on: false };
  if (act === "heating") return { key: "heating", label: "En chauffe", on: true, flame: true };
  if (act === "idle") return { key: "idle", label: "En attente", on: true, flame: false };
  if (act === "fan" || s === "fan_only") return { key: "fan", label: "Ventilation", on: true, flame: false };
  return { key: "heating", label: "Allumé", on: true, flame: true };
}

let UID = 0;

function stoveSvg(flame, ledOn, uid) {
  const flames = flame ? `
    <g class="flames" clip-path="url(#sv-door-${uid})">
      <ellipse cx="60" cy="140" rx="30" ry="14" fill="url(#sv-glow-${uid})" class="glowpulse"/>
      <path class="fl f1" d="M60 142 C44 134 46 116 54 104 C56 112 62 112 62 100 C72 112 78 128 60 142Z" fill="#ff8a3d"/>
      <path class="fl f2" d="M48 142 C40 134 42 122 48 114 C50 120 54 120 55 112 C62 122 62 134 48 142Z" fill="#ff5a2a"/>
      <path class="fl f3" d="M74 142 C66 136 68 124 73 118 C75 123 78 123 79 117 C85 126 84 136 74 142Z" fill="#ffb347"/>
      <path class="fl f4" d="M60 142 C53 137 54 128 58 122 C60 127 63 127 64 121 C68 128 68 137 60 142Z" fill="#ffe08a"/>
    </g>` : "";
  return `
<svg viewBox="0 0 120 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <clipPath id="sv-door-${uid}"><rect x="28" y="62" width="64" height="84" rx="8"/></clipPath>
    <radialGradient id="sv-glow-${uid}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffb347" stop-opacity=".85"/><stop offset="100%" stop-color="#ff5a2a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sv-body-${uid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#2f343b"/><stop offset="45%" stop-color="#444b54"/><stop offset="100%" stop-color="#2a2e34"/>
    </linearGradient>
  </defs>
  <rect x="20" y="192" width="10" height="6" rx="2" fill="#1d2025"/><rect x="90" y="192" width="10" height="6" rx="2" fill="#1d2025"/>
  <rect x="14" y="40" width="92" height="152" rx="10" fill="url(#sv-body-${uid})" stroke="#5b626d" stroke-width="1.2"/>
  <rect x="20" y="20" width="80" height="26" rx="7" fill="#3a4048" stroke="#5b626d" stroke-width="1.2"/>
  <rect x="26" y="26" width="68" height="3" rx="1.5" fill="#262a30"/>
  <rect x="40" y="33" width="40" height="9" rx="2.5" fill="#15181c"/>
  <circle cx="47" cy="37.5" r="2.2" fill="${ledOn ? "#ff8a3d" : "#4a4f57"}" class="${ledOn ? "led" : ""}"/>
  <rect x="55" y="36" width="20" height="3" rx="1.5" fill="#4a4f57"/>
  <rect x="28" y="62" width="64" height="84" rx="8" fill="#101318" stroke="#6a717c" stroke-width="1.4"/>
  ${flames}
  <rect x="28" y="62" width="64" height="84" rx="8" fill="none" stroke="#8a919c" stroke-width=".8" opacity=".5"/>
  <path d="M34 70 L52 70 L34 98 Z" fill="#ffffff" opacity=".06"/>
  <rect x="34" y="154" width="52" height="18" rx="3" fill="#20242a" stroke="#555c66" stroke-width="1"/>
  <g stroke="#555c66" stroke-width="1"><line x1="42" y1="158" x2="42" y2="168"/><line x1="50" y1="158" x2="50" y2="168"/><line x1="58" y1="158" x2="58" y2="168"/><line x1="66" y1="158" x2="66" y2="168"/><line x1="74" y1="158" x2="74" y2="168"/></g>
  <rect x="38" y="178" width="44" height="3" rx="1.5" fill="#262a30"/>
</svg>`;
}

class PelletStoveCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("pellet-stove-card-editor");
  }

  static getStubConfig(hass) {
    const climates = Object.keys((hass && hass.states) || {}).filter((e) => e.startsWith("climate."));
    const guess = climates.find((e) => /po[eê]le|stove|pellet|granul|boston/i.test(e + " " + ((hass.states[e].attributes || {}).friendly_name || "")))
      || climates[0] || "";
    return { ...DEFAULTS, entity: guess };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._sig = "";
    this._uid = ++UID;
    this._pending = null;
  }

  setConfig(config) {
    if (!config || !config.entity) throw new Error("pellet-stove-card : « entity » (l'entité climate du poêle) est obligatoire");
    this._config = { ...DEFAULTS, ...config };
    if (!Array.isArray(this._config.info_entities)) this._config.info_entities = [];
    this._sig = "";
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    const infos = this._infos().map((i) => i.entity);
    const ids = [this._config.entity, this._config.pellet_entity, this._config.status_entity, this._config.power_entity, ...infos].filter(Boolean);
    const sig = ids.map((e) => {
      const s = hass.states[e];
      return s ? s.state + "|" + JSON.stringify([s.attributes.hvac_action, s.attributes.temperature, s.attributes.current_temperature]) : "x";
    }).join(";") + "#" + (this._isDark() ? "d" : "l") + "#" + this._pending;
    if (sig !== this._sig) {
      this._sig = sig;
      this._render();
    }
  }

  getCardSize() { return 5; }

  _infos() {
    return (this._config.info_entities || [])
      .map((i) => (typeof i === "string" ? { entity: i } : i))
      .filter((i) => i && i.entity);
  }

  _isDark() {
    const t = this._config && this._config.theme;
    if (t === "dark") return true;
    if (t === "light") return false;
    const dm = this._hass && this._hass.themes && this._hass.themes.darkMode;
    if (typeof dm === "boolean") return dm;
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  _fmt(n, digits = 1) {
    const lang = (this._hass && this._hass.locale && this._hass.locale.language) || "fr";
    return new Intl.NumberFormat(lang, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(n));
  }

  _unit() {
    return (this._hass && this._hass.config && this._hass.config.unit_system && this._hass.config.unit_system.temperature) || "°C";
  }

  _more(id) {
    if (!id) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: id } }));
  }

  _stepSize(st) {
    const c = Number(this._config.temp_step);
    if (c > 0) return c;
    const a = Number(st.attributes.target_temp_step);
    return a > 0 ? a : 0.5;
  }

  _adjust(dir) {
    const st = this._hass.states[this._config.entity];
    if (bad(st)) return;
    const step = this._stepSize(st);
    const min = isNum(st.attributes.min_temp) ? Number(st.attributes.min_temp) : 5;
    const max = isNum(st.attributes.max_temp) ? Number(st.attributes.max_temp) : 35;
    const base = this._pending !== null ? this._pending : Number(st.attributes.temperature);
    if (!isNum(base)) return;
    const next = Math.min(max, Math.max(min, Math.round((base + dir * step) / step) * step));
    this._pending = Math.round(next * 100) / 100;
    this._sig = "";
    this._render();
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this._hass.callService("climate", "set_temperature", { entity_id: this._config.entity, temperature: this._pending });
      setTimeout(() => { this._pending = null; this._sig = ""; this._render(); }, 4000);
    }, 700);
  }

  _setLevel(v) {
    const eid = this._config.power_entity;
    if (!eid) return;
    const dom = eid.split(".")[0];
    this._levelPending = v; this._sig = ""; this._render();
    this._hass.callService(dom === "number" || dom === "input_number" ? dom : "input_number", "set_value", { entity_id: eid, value: v });
    clearTimeout(this._levelTimer);
    this._levelTimer = setTimeout(() => { this._levelPending = null; this._sig = ""; this._render(); }, 4000);
  }

  _power() {
    const st = this._hass.states[this._config.entity];
    if (bad(st)) return;
    const eid = this._config.entity;
    const modes = st.attributes.hvac_modes || [];
    const turningOff = st.state !== "off";
    const question = turningOff ? "Éteindre le poêle ?" : "Allumer le poêle ? Vérifiez que la zone est dégagée.";
    if (!window.confirm(question)) return;
    if (turningOff) {
      if (modes.includes("off")) this._hass.callService("climate", "set_hvac_mode", { entity_id: eid, hvac_mode: "off" });
      else this._hass.callService("climate", "turn_off", { entity_id: eid });
    } else {
      const on = ["heat", "auto", "heat_cool"].find((m) => modes.includes(m));
      if (on) this._hass.callService("climate", "set_hvac_mode", { entity_id: eid, hvac_mode: on });
      else this._hass.callService("climate", "turn_on", { entity_id: eid });
    }
  }

  _render() {
    const c = this._config;
    const h = this._hass;
    if (!c || !h) return;
    const st = h.states[c.entity];
    const ss = stoveState(st);
    const sst = c.status_entity ? h.states[c.status_entity] : null;
    if (c.status_entity) {
      const tr = translateStatus(sst ? sst.state : "unavailable", c.status_map);
      ss.label = tr.label;
      if (tr.tone === "off" || tr.tone === "err") { ss.flame = false; if (tr.tone === "off") ss.on = false; }
      else if (tr.tone === "fire") { ss.flame = true; ss.on = true; }
      ss.key = tr.tone === "fire" ? "heating" : tr.tone === "ok" ? "idle" : tr.tone;
    }
    const dark = this._isDark();
    const name = c.name || (st && st.attributes.friendly_name) || "Poêle";
    const attrs = (st && st.attributes) || {};
    const unit = this._unit();

    const cur = isNum(attrs.current_temperature) ? this._fmt(attrs.current_temperature) : "—";
    const tgtRaw = this._pending !== null ? this._pending : attrs.temperature;
    const hasTarget = isNum(tgtRaw);
    const tgt = hasTarget ? this._fmt(tgtRaw) : "—";

    // Capteurs associés
    const tiles = this._infos().map((i) => {
      const s = h.states[i.entity];
      const label = i.name || (s && s.attributes.friendly_name) || i.entity;
      const ok = !bad(s);
      let val = "—";
      if (ok) {
        val = isNum(s.state) ? this._fmt(s.state, Number.isInteger(Number(s.state)) ? 0 : 1) : String(s.state);
        const u = s.attributes.unit_of_measurement;
        if (u) val += " " + u;
      }
      const icon = i.icon || (s && (s.attributes.icon || ICONS[s.attributes.device_class])) || "mdi:information-outline";
      return `<button class="tile" data-more="${esc(i.entity)}" title="${esc(label)}">
        <span class="tl"><ha-icon icon="${esc(icon)}"></ha-icon><span class="tn">${esc(label)}</span></span>
        <span class="tv">${esc(val)}</span></button>`;
    }).join("");

    // Granulés
    let pellet = "";
    if (c.pellet_entity) {
      const ps = h.states[c.pellet_entity];
      const ok = !bad(ps) && isNum(ps.state);
      const lvl = ok ? Math.max(0, Math.min(100, Number(ps.state))) : null;
      const tone = lvl === null ? "off" : lvl <= 10 ? "err" : lvl <= 25 ? "warn" : "ok";
      pellet = `<button class="pellet ${tone}" data-more="${esc(c.pellet_entity)}">
        <span class="tl"><ha-icon icon="mdi:grain"></ha-icon><span class="tn">Granulés</span></span>
        <span class="pv">${lvl === null ? "—" : Math.round(lvl) + " %"}</span>
        <i class="bar"><u style="width:${lvl === null ? 0 : lvl}%"></u></i></button>`;
    }

    // Puissance (1 à 5)
    let powerHtml = "";
    if (c.power_entity) {
      const pst = h.states[c.power_entity];
      const pa = (pst && pst.attributes) || {};
      const pmin = isNum(c.power_min) ? Number(c.power_min) : 1, pmax = isNum(c.power_max) ? Number(c.power_max) : 5;
      const curv = this._levelPending !== null && this._levelPending !== undefined ? this._levelPending : (!bad(pst) && isNum(pst.state) ? Number(pst.state) : null);
      const btns = [];
      for (let v = pmin; v <= pmax && btns.length < 12; v++) {
        btns.push(`<button class="lv ${curv !== null && v <= curv ? "on" : ""} ${curv === v ? "cur" : ""}" data-level="${v}" aria-label="Puissance ${v}"${c.show_controls ? "" : " disabled"}>${v}</button>`);
      }
      powerHtml = `<div class="powerbox"><div class="pwh"><span class="tl"><ha-icon icon="mdi:fire"></ha-icon><span class="tn">${esc(c.power_name || "Puissance")}</span></span>
        <button class="pwv" data-more="${esc(c.power_entity)}">${curv === null ? "—" : esc(curv) + " / " + pmax}</button></div>
        <div class="lvls">${btns.join("")}</div></div>`;
    }

    const bgMode = c.image && c.image_mode !== "replace";
    const photo = c.image_mode === "replace" && c.image && !/^\s*(javascript|vbscript|data:text)/i.test(String(c.image)) && this._imgFailed !== c.image;
    const bgLayer = c.image && bgMode && !/^\s*(javascript|vbscript|data:text)/i.test(String(c.image)) && this._imgFailed !== c.image
      ? `<div class="bgimg" style="background-image:url('${esc(String(c.image).replace(/'/g, "%27"))}');opacity:${isNum(c.image_opacity) ? Number(c.image_opacity) : 0.35}"></div><div class="bgshade"></div>` : "";
    const art = photo
      ? `<div class="art photo"><img src="${esc(c.image)}" alt="${esc(name)}"></div>`
      : `<div class="art">${stoveSvg(!!ss.flame, ss.on, this._uid)}</div>`;

    const extra = [attrs.preset_mode, attrs.fan_mode].filter(Boolean);
    const extraHtml = extra.length ? `<div class="chips">${extra.map((e) => `<span class="chip">${esc(e)}</span>`).join("")}</div>` : "";

    this.shadowRoot.innerHTML = `
      <style>
        * { box-sizing: border-box; }
        ha-card.dark {
          --sv-text:#f4f6fb; --sv-muted:#a9afc0; --sv-bg:var(--g-bg-x,linear-gradient(160deg,#1b1e32 0%,#241a2a 55%,#2d1519 100%));
          --sv-border:rgba(255,255,255,.14); --sv-shadow:0 .6em 2em rgba(0,0,0,.35);
          --sv-glass:rgba(255,255,255,.07); --sv-glass-b:rgba(255,255,255,.13);
          --sv-fill:rgba(255,255,255,.09); --sv-fill-b:rgba(255,255,255,.16); --sv-track:rgba(255,255,255,.16);
          --sv-bgc:#1b1e32; --sv-ok:#3ddc84; --sv-warn:#ffb86b; --sv-err:#ff5a5f; --sv-fire:#ff8a3d; --sv-off:#8a8f9c;
        }
        ha-card.light {
          --sv-text:#1c2030; --sv-muted:#5d6477; --sv-bg:var(--g-bg-x,linear-gradient(160deg,#f8f9fd 0%,#eef1f8 55%,#f8eff0 100%));
          --sv-border:rgba(20,24,40,.12); --sv-shadow:0 .4em 1.4em rgba(20,24,40,.12);
          --sv-glass:rgba(255,255,255,.7); --sv-glass-b:rgba(20,24,40,.1);
          --sv-fill:rgba(20,24,40,.06); --sv-fill-b:rgba(20,24,40,.14); --sv-track:rgba(20,24,40,.12);
          --sv-bgc:#f8f9fd; --sv-ok:#1a9d55; --sv-warn:#c77a14; --sv-err:#d32f35; --sv-fire:#e06a14; --sv-off:#8a8f9c;
        }
        .bgimg { position:absolute; inset:0; background-size:cover; background-position:center; pointer-events:none; }
        .bgshade { position:absolute; inset:0; pointer-events:none; background:linear-gradient(180deg, transparent 30%, color-mix(in srgb, var(--sv-bgc) 55%, transparent) 100%); }
        ha-card > * { position:relative; }
        ha-card > .bgimg, ha-card > .bgshade { position:absolute; }
        ha-card { position:relative; display:flex; flex-direction:column; gap:12px; padding:16px; overflow:hidden; color:var(--sv-text);
          border-radius:24px; border:1px solid var(--sv-border); background:var(--sv-bg); box-shadow:var(--sv-shadow); }
        button { font:inherit; color:inherit; cursor:pointer; border:0; background:none; padding:0; text-align:left; -webkit-tap-highlight-color:transparent; }
        ha-icon { --mdc-icon-size:1.2em; flex:none; }
        .head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .title { min-width:0; display:flex; flex-direction:column; gap:3px; }
        .title b { font-size:1.1em; font-weight:650; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .state { display:flex; align-items:center; gap:.5em; font-size:.85em; font-weight:600; color:var(--sv-off); }
        .state::before { content:""; width:.6em; height:.6em; border-radius:50%; background:currentColor; box-shadow:0 0 .6em currentColor; flex:none; }
        .state.heating { color:var(--sv-fire); } .state.idle, .state.fan, .state.ok { color:var(--sv-ok); } .state.warn { color:var(--sv-warn); } .state.err { color:var(--sv-err); }
        .powerbox { display:flex; flex-direction:column; gap:.55em; padding:.7em .85em; border-radius:1em; background:var(--sv-glass); border:1px solid var(--sv-glass-b); -webkit-backdrop-filter:blur(18px) saturate(140%); backdrop-filter:blur(18px) saturate(140%); }
        .pwh { display:flex; justify-content:space-between; align-items:center; } .pwv { font-weight:700; font-variant-numeric:tabular-nums; }
        .lvls { display:flex; gap:.4em; }
        .lv { flex:1; text-align:center; padding:.55em 0; border-radius:.7em; font-weight:700; background:var(--sv-fill); border:1px solid var(--sv-fill-b); touch-action:manipulation; }
        .lv.on { background:color-mix(in srgb, var(--sv-fire) 28%, transparent); border-color:var(--sv-fire); } .lv.cur { background:var(--sv-fire); color:#fff; } .lv:disabled { cursor:default; }
        .power { display:grid; place-items:center; width:2.8em; height:2.8em; border-radius:50%; background:var(--sv-fill); border:1px solid var(--sv-fill-b); }
        .power ha-icon { --mdc-icon-size:1.5em; }
        .power.on { color:var(--sv-fire); border-color:var(--sv-fire); }
        .panel { display:grid; grid-template-columns: minmax(0,.85fr) minmax(0,1.15fr); gap:12px; align-items:center; padding:14px; border-radius:18px;
          background:var(--sv-glass); border:1px solid var(--sv-glass-b); -webkit-backdrop-filter:blur(18px) saturate(140%); backdrop-filter:blur(18px) saturate(140%); }
        .panel.fire { box-shadow: inset 0 0 3.2em color-mix(in srgb, var(--sv-fire) 20%, transparent); }
        .art { display:flex; justify-content:center; }
        .art svg { width:100%; max-width:150px; height:auto; }
        .art.photo img { max-width:100%; max-height:190px; object-fit:contain; border-radius:12px; }
        .panel.fire .art.photo img { filter:drop-shadow(0 0 14px color-mix(in srgb, var(--sv-fire) 60%, transparent)); }
        .read { display:flex; flex-direction:column; gap:12px; min-width:0; }
        .lbl { font-size:.72em; text-transform:uppercase; letter-spacing:.08em; color:var(--sv-muted); }
        .big { font-size:2.6em; font-weight:700; line-height:1; font-variant-numeric:tabular-nums; }
        .big small { font-size:.4em; font-weight:600; opacity:.7; margin-left:.15em; }
        .set { display:flex; align-items:center; gap:.5em; }
        .set .val { font-size:1.5em; font-weight:650; min-width:3.6em; text-align:center; font-variant-numeric:tabular-nums; }
        .set .val small { font-size:.55em; opacity:.7; margin-left:.1em; }
        .step { display:grid; place-items:center; width:2.4em; height:2.4em; border-radius:50%; background:var(--sv-fill); border:1px solid var(--sv-fill-b); font-size:1.1em; font-weight:700; touch-action:manipulation; }
        .step:active { background:var(--sv-fill-b); }
        .chips { display:flex; flex-wrap:wrap; gap:.5em; }
        .chip { padding:.3em .8em; border-radius:2em; font-size:.8em; font-weight:600; background:var(--sv-fill); border:1px solid var(--sv-fill-b); }
        .tiles { display:grid; grid-template-columns:repeat(auto-fit,minmax(9em,1fr)); gap:.6em; }
        .tile, .pellet { display:flex; flex-direction:column; gap:.35em; padding:.7em .85em; border-radius:1em; background:var(--sv-glass); border:1px solid var(--sv-glass-b); min-width:0; }
        .tl { display:flex; align-items:center; gap:.45em; font-size:.74em; color:var(--sv-muted); min-width:0; }
        .tn { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .tv { font-size:1.2em; font-weight:650; font-variant-numeric:tabular-nums; }
        .pellet { gap:.4em; }
        .pv { font-size:1.2em; font-weight:650; }
        .bar { display:block; height:.35em; border-radius:.2em; background:var(--sv-track); overflow:hidden; }
        .bar u { display:block; height:100%; border-radius:inherit; background:var(--sv-ok); text-decoration:none; transition:width .4s; }
        .pellet.warn .bar u { background:var(--sv-warn); } .pellet.err .bar u, .pellet.off .bar u { background:var(--sv-err); }
        .pellet.err .pv { color:var(--sv-err); } .pellet.warn .pv { color:var(--sv-warn); }
        /* flamme */
        .fl { transform-box:fill-box; transform-origin:50% 100%; animation:sv-flick 1.4s ease-in-out infinite; }
        .f2 { animation-duration:1.1s; animation-delay:-.3s; } .f3 { animation-duration:1.7s; animation-delay:-.6s; } .f4 { animation-duration:.9s; animation-delay:-.2s; }
        @keyframes sv-flick { 0%,100% { transform:scale(1,1) skewX(0); } 25% { transform:scale(.94,1.1) skewX(2deg); } 50% { transform:scale(1.04,.92) skewX(-2deg); } 75% { transform:scale(.96,1.08) skewX(1deg); } }
        .glowpulse { animation:sv-glow 2.2s ease-in-out infinite; } @keyframes sv-glow { 50% { opacity:.6; } }
        .led { animation:sv-led 1.6s ease-in-out infinite; } @keyframes sv-led { 50% { opacity:.35; } }
        @media (prefers-reduced-motion: reduce) { .fl, .glowpulse, .led { animation:none; } }
        @container (max-width:300px) { .panel { grid-template-columns:1fr; } }
      </style>
      <ha-card class="${dark ? "dark" : "light"}" style="${gvStyle(this._config, dark)}">${bgLayer}
        <div class="head">
          <div class="title"><b>${esc(name)}</b><span class="state ${ss.key}">${esc(ss.label)}</span></div>
          ${c.show_controls && !ss.unknown ? `<button class="power ${ss.on ? "on" : ""}" data-action="power" title="${ss.on ? "Éteindre" : "Allumer"}"><ha-icon icon="mdi:power"></ha-icon></button>` : ""}
        </div>
        <div class="panel ${ss.flame ? "fire" : ""}">
          ${art}
          <div class="read">
            <div><div class="lbl">Température</div>
              <button class="big" data-more="${esc(c.entity)}">${esc(cur)}<small>${esc(unit)}</small></button></div>
            ${hasTarget ? `<div><div class="lbl">Consigne</div>
              <div class="set">
                ${c.show_controls ? `<button class="step" data-action="down" aria-label="Baisser">−</button>` : ""}
                <span class="val">${esc(tgt)}<small>${esc(unit)}</small></span>
                ${c.show_controls ? `<button class="step" data-action="up" aria-label="Augmenter">+</button>` : ""}
              </div></div>` : ""}
          </div>
        </div>
        ${extraHtml}
        ${powerHtml}
        ${pellet}
        ${tiles ? `<div class="tiles">${tiles}</div>` : ""}
      </ha-card>`;

    const root = this.shadowRoot;
    root.querySelectorAll("[data-more]").forEach((el) => el.addEventListener("click", () => this._more(el.dataset.more)));
    root.querySelectorAll("[data-level]").forEach((el) => el.addEventListener("click", () => this._setLevel(Number(el.dataset.level))));
    root.querySelectorAll(".bgimg").forEach(() => { const im = new Image(); im.onerror = () => { this._imgFailed = c.image; this._sig = ""; this._render(); }; im.src = c.image; });
    root.querySelectorAll("[data-action]").forEach((el) => el.addEventListener("click", () => {
      const a = el.dataset.action;
      if (a === "power") this._power();
      else this._adjust(a === "up" ? 1 : -1);
    }));
    root.querySelectorAll(".art.photo img").forEach((img) => img.addEventListener("error", () => {
      this._imgFailed = c.image; this._sig = ""; this._render();
    }));
  }
}

/* ---------- Éditeur visuel ---------- */
const LABELS = { ...GV_LABELS,
  entity: "Poêle (entité climate)", name: "Nom (facultatif)", pellet_entity: "Niveau de granulés (facultatif)",
  info_entities: "Capteurs à afficher (fumées, air, puissance...)", image: "Photo du poêle (ex. /local/poele.png)",
  status_entity: "Entité du statut (traduit en français)", power_entity: "Puissance (input_number / number)", power_min: "Puissance minimale", power_max: "Puissance maximale",
  image_mode: "Photo", image_opacity: "Opacité de la photo de fond",
  temp_step: "Pas de la consigne (0 = automatique)", show_controls: "Afficher les boutons (marche/arrêt, consigne)", theme: "Thème",
};

class PelletStoveCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...DEFAULTS, ...config };
    this._build();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }

  _build() {
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => LABELS[s.name] || s.name;
      this._form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        const cfg = { ...this._config, ...ev.detail.value };
        ["status_entity", "power_entity", "pellet_entity", "image"].forEach((k) => { if (cfg[k] === "" || cfg[k] == null) delete cfg[k]; });
        this._config = cfg;
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.data = { ...this._config, info_entities: (this._config.info_entities || []).map((i) => (typeof i === "string" ? i : i.entity)) };
    this._form.schema = [
      { name: "entity", required: true, selector: { entity: { domain: "climate" } } },
      { name: "name", selector: { text: {} } },
      { name: "info_entities", selector: { entity: { multiple: true } } },
      { name: "pellet_entity", selector: { entity: {} } },
      { name: "status_entity", selector: { entity: {} } },
      { name: "power_entity", selector: { entity: { domain: ["input_number", "number"] } } },
      { type: "grid", name: "", schema: [
        { name: "power_min", selector: { number: { min: 0, max: 20, mode: "box" } } },
        { name: "power_max", selector: { number: { min: 1, max: 20, mode: "box" } } },
      ] },
      { name: "image", selector: { text: {} } },
      { type: "grid", name: "", schema: [
        { name: "image_mode", selector: { select: { mode: "dropdown", options: [
          { value: "background", label: "En fond, avec le dessin animé" }, { value: "replace", label: "À la place du dessin" } ] } } },
        { name: "image_opacity", selector: { number: { min: 0.05, max: 1, step: 0.05, mode: "slider" } } },
      ] },
      {
        type: "grid", name: "", schema: [
          { name: "temp_step", selector: { number: { min: 0, max: 5, step: 0.1, mode: "box" } } },
          {
            name: "theme", selector: {
              select: {
                mode: "dropdown", options: [
                  { value: "auto", label: "Automatique (thème de Home Assistant)" },
                  { value: "light", label: "Clair" },
                  { value: "dark", label: "Sombre" },
                ],
              },
            },
          }, ...GV_FIELDS,
        ],
      },
      { name: "show_controls", selector: { boolean: {} } },
    ];
  }
}

customElements.define("pellet-stove-card", PelletStoveCard);
customElements.define("pellet-stove-card-editor", PelletStoveCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "pellet-stove-card",
  name: "Pellet Stove Card (FR)",
  description: "Poêle à granulés : flamme animée, température, consigne, marche/arrêt et capteurs associés.",
  preview: true,
});

console.info(
  `%c PELLET-STOVE-CARD %c v${CARD_VERSION} `,
  "color:#fff;background:#e06a14;font-weight:700;border-radius:3px 0 0 3px;padding:2px 4px",
  "color:#e06a14;background:#fff;font-weight:700;border-radius:0 3px 3px 0;padding:2px 4px"
);
}
