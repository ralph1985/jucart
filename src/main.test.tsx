import { beforeEach, describe, expect, it, vi } from "vitest";

const mainMocks = vi.hoisted(() => ({
  createRoot: vi.fn(),
  render: vi.fn(),
}));

vi.mock("react-dom/client", () => ({
  createRoot: mainMocks.createRoot,
}));

vi.mock("./App", () => ({
  App: () => <div data-testid="app" />,
}));

describe("main", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="root"></div>';
    mainMocks.createRoot.mockReturnValue({ render: mainMocks.render });
  });

  it("renders the app without registering a service worker", async () => {
    const rootElement = document.getElementById("root");

    await import("./main");
    expect(mainMocks.createRoot).toHaveBeenCalledWith(rootElement);
    expect(mainMocks.render).toHaveBeenCalledOnce();
  });
});
