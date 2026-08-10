import { useEffect, useState } from "react";

import type { ThemePreference } from "../components/app/AppHeader";

const storageKey = "jucart:theme-preference";

function getStoredThemePreference(): ThemePreference {
  const preference = window.localStorage.getItem(storageKey);

  return preference === "light" || preference === "dark" ? preference : "auto";
}

function getSystemTheme(): Exclude<ThemePreference, "auto"> {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getNextThemePreference(preference: ThemePreference): ThemePreference {
  if (preference === "auto") {
    return "light";
  }

  return preference === "light" ? "dark" : "auto";
}

export function useThemePreference() {
  const [themePreference, setThemePreference] = useState<ThemePreference>(
    getStoredThemePreference,
  );
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const resolvedTheme =
    themePreference === "auto" ? systemTheme : themePreference;

  useEffect(() => {
    if (!window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    document.body.classList.toggle(
      "jucart-theme-dark",
      resolvedTheme === "dark",
    );
    document.documentElement.style.colorScheme = resolvedTheme;

    return () => {
      document.body.classList.remove("jucart-theme-dark");
      document.documentElement.style.removeProperty("color-scheme");
    };
  }, [resolvedTheme]);

  function cycleThemePreference() {
    setThemePreference((currentPreference) => {
      const nextPreference = getNextThemePreference(currentPreference);
      window.localStorage.setItem(storageKey, nextPreference);
      return nextPreference;
    });
  }

  return { themePreference, resolvedTheme, cycleThemePreference };
}
