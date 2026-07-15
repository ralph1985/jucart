import { afterEach, describe, expect, it, vi } from "vitest";

function setBadgeApi({
  setAppBadge = vi.fn(() => Promise.resolve()),
  clearAppBadge = vi.fn(() => Promise.resolve()),
}: {
  setAppBadge?: Navigator["setAppBadge"];
  clearAppBadge?: Navigator["clearAppBadge"];
} = {}) {
  Object.defineProperty(navigator, "setAppBadge", {
    configurable: true,
    value: setAppBadge,
  });
  Object.defineProperty(navigator, "clearAppBadge", {
    configurable: true,
    value: clearAppBadge,
  });

  return { setAppBadge, clearAppBadge };
}

function removeBadgeApi() {
  Reflect.deleteProperty(navigator, "setAppBadge");
  Reflect.deleteProperty(navigator, "clearAppBadge");
}

async function importBadgeService() {
  vi.resetModules();
  return import("./badgeService");
}

afterEach(() => {
  removeBadgeApi();
  vi.restoreAllMocks();
});

describe("badgeService", () => {
  it("sets the app badge when the API is supported and there are pending products", async () => {
    const { setAppBadge, clearAppBadge } = setBadgeApi();
    const { updateBadge } = await importBadgeService();

    await updateBadge(3);

    expect(setAppBadge).toHaveBeenCalledTimes(1);
    expect(setAppBadge).toHaveBeenCalledWith(3);
    expect(clearAppBadge).not.toHaveBeenCalled();
  });

  it("clears the app badge when the pending count is zero", async () => {
    const { setAppBadge, clearAppBadge } = setBadgeApi();
    const { updateBadge } = await importBadgeService();

    await updateBadge(0);

    expect(clearAppBadge).toHaveBeenCalledTimes(1);
    expect(setAppBadge).not.toHaveBeenCalled();
  });

  it("does nothing when the Badging API is not supported", async () => {
    removeBadgeApi();
    const { updateBadge } = await importBadgeService();

    await expect(updateBadge(2)).resolves.toBeUndefined();
  });

  it("updates the badge for consecutive different counts", async () => {
    const { setAppBadge, clearAppBadge } = setBadgeApi();
    const { updateBadge } = await importBadgeService();

    await updateBadge(2);
    await updateBadge(4);
    await updateBadge(0);

    expect(setAppBadge).toHaveBeenCalledTimes(2);
    expect(setAppBadge).toHaveBeenNthCalledWith(1, 2);
    expect(setAppBadge).toHaveBeenNthCalledWith(2, 4);
    expect(clearAppBadge).toHaveBeenCalledTimes(1);
  });

  it("does not call the API again when the count has not changed", async () => {
    const { setAppBadge, clearAppBadge } = setBadgeApi();
    const { updateBadge } = await importBadgeService();

    await updateBadge(5);
    await updateBadge(5);

    expect(setAppBadge).toHaveBeenCalledTimes(1);
    expect(clearAppBadge).not.toHaveBeenCalled();
  });

  it("captures Badging API errors without failing the app", async () => {
    const setAppBadge = vi.fn(() => Promise.reject(new Error("Not allowed")));
    setBadgeApi({ setAppBadge });
    const { updateBadge } = await importBadgeService();

    await expect(updateBadge(1)).resolves.toBeUndefined();
    await updateBadge(1);

    expect(setAppBadge).toHaveBeenCalledTimes(1);
  });
});
