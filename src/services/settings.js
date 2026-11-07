import { setLanguage } from "./i18n.js";

const KEY = "pcmm-settings";
const DEFAULTS = { theme: "dark", lang: "ru", compact: false, motion: true, confirmForce: true };

export function getSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch { return { ...DEFAULTS }; }
}
export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* хранилище недоступно */ }
  applySettings(next);
  return next;
}
export function applySettings(s = getSettings()) {
  document.documentElement.dataset.theme = s.theme;
  document.documentElement.lang = s.lang;
  document.body.classList.toggle("compact-ui", !!s.compact);
  document.body.classList.toggle("reduce-motion-ui", s.motion === false);
  setLanguage(s.lang);
}
