const appActivationStorageKey = "jucart:app-release";
const fallbackVersion = "0.9.0";
const fallbackBuildDate = "1970-01-01T00:00:00.000Z";

export type AppReleaseInfo = {
  version: string;
  buildDate: string;
  activatedAt: string;
};

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function getCurrentAppRelease(
  now: () => Date = () => new Date(),
): AppReleaseInfo {
  const version = import.meta.env.VITE_APP_VERSION ?? fallbackVersion;
  const buildDate = import.meta.env.VITE_APP_BUILD_DATE ?? fallbackBuildDate;

  try {
    const storedValue = window.localStorage.getItem(appActivationStorageKey);
    if (storedValue) {
      const storedRelease = JSON.parse(storedValue) as Partial<AppReleaseInfo>;
      if (
        storedRelease.version === version &&
        isValidDate(storedRelease.activatedAt)
      ) {
        return {
          version,
          buildDate,
          activatedAt: storedRelease.activatedAt,
        };
      }
    }

    const activatedAt = now().toISOString();
    window.localStorage.setItem(
      appActivationStorageKey,
      JSON.stringify({ version, activatedAt }),
    );

    return { version, buildDate, activatedAt };
  } catch {
    return { version, buildDate, activatedAt: now().toISOString() };
  }
}

export function formatAppDate(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
