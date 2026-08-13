import { beforeEach, describe, expect, it } from "vitest";

import { formatAppDate, getCurrentAppRelease } from "./appVersion";

describe("appVersion", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("registra la primera activación de la versión", () => {
    const release = getCurrentAppRelease(
      () => new Date("2026-07-28T10:30:00.000Z"),
    );

    expect(release.version).toBe("0.16.0");
    expect(release.activatedAt).toBe("2026-07-28T10:30:00.000Z");
    expect(window.localStorage.getItem("jucart:app-release")).toContain(
      "2026-07-28T10:30:00.000Z",
    );
  });

  it("conserva la fecha si la versión no cambia", () => {
    const firstRelease = getCurrentAppRelease(
      () => new Date("2026-07-28T10:30:00.000Z"),
    );
    const secondRelease = getCurrentAppRelease(
      () => new Date("2026-07-29T10:30:00.000Z"),
    );

    expect(secondRelease.activatedAt).toBe(firstRelease.activatedAt);
  });

  it("formatea las fechas para la cabecera", () => {
    expect(formatAppDate("2026-07-28T10:30:00.000Z")).toBe("28/07/2026");
  });
});
