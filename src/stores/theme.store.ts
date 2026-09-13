import { computed, ref, watchEffect } from "vue";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "oc:theme";
const media = window.matchMedia("(prefers-color-scheme: dark)");

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // storage unavailable (private mode, blocked), fall back to system
  }
  return "system";
}

/** The user's choice: light, dark, or follow the OS. Persisted per browser. */
export const themePreference = ref<ThemePreference>(readPreference());
const systemIsDark = ref(media.matches);
media.addEventListener("change", (e) => (systemIsDark.value = e.matches));

/** The theme actually applied right now. */
export const resolvedTheme = computed<"light" | "dark">(() =>
  themePreference.value === "system" ? (systemIsDark.value ? "dark" : "light") : themePreference.value
);

export const isDark = computed(() => resolvedTheme.value === "dark");

export function setTheme(preference: ThemePreference) {
  themePreference.value = preference;
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // ignore
  }
}

export function toggleTheme() {
  setTheme(isDark.value ? "light" : "dark");
}

// Keep the `dark` class on <html> in sync. index.html applies it before the app
// mounts so there is no flash; this keeps it right afterwards.
watchEffect(() => {
  document.documentElement.classList.toggle("dark", isDark.value);
});
