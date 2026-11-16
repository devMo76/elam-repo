export type Theme = "light" | "dark";
export const THEME_STORAGE_KEY = "elam.theme";
const THEME_EVENT = "elam:theme-change";
let memoryPreference: Theme | null = null;

function parseTheme(value: string | null): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}
function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function savedTheme(): Theme | null {
  try { return parseTheme(window.localStorage.getItem(THEME_STORAGE_KEY)) ?? memoryPreference; }
  catch { return memoryPreference; }
}
function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

// Constant early initializer, managed by next/script before hydration.
export const themeInitializationScript = `(()=>{let t;try{t=localStorage.getItem("${THEME_STORAGE_KEY}")}catch{}document.documentElement.dataset.theme=t==="light"||t==="dark"?t:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"})()`;

export function getThemeSnapshot(): Theme {
  return parseTheme(document.documentElement.dataset.theme ?? null) ?? systemTheme();
}
export function getServerThemeSnapshot(): Theme { return "light"; }

export function setTheme(theme: Theme) {
  memoryPreference = theme;
  applyTheme(theme);
  try { window.localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* In-memory choice still works. */ }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function subscribeTheme(notify: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (savedTheme() === null) { applyTheme(systemTheme()); notify(); }
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    memoryPreference = parseTheme(event.newValue);
    applyTheme(memoryPreference ?? systemTheme());
    notify();
  };
  applyTheme(savedTheme() ?? systemTheme());
  window.addEventListener(THEME_EVENT, notify);
  window.addEventListener("storage", onStorage);
  media.addEventListener("change", onSystemChange);
  return () => {
    window.removeEventListener(THEME_EVENT, notify);
    window.removeEventListener("storage", onStorage);
    media.removeEventListener("change", onSystemChange);
  };
}
