import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useVisualViewportInset } from "./useVisualViewportInset";

function ViewportInsetProbe() {
  const inset = useVisualViewportInset();
  return <output data-testid="inset">{inset}</output>;
}

describe("useVisualViewportInset", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("updates when the visual viewport is reduced by the keyboard", () => {
    const listeners = new Map<string, EventListener>();
    const visualViewport = {
      height: 800,
      offsetTop: 0,
      addEventListener: vi.fn((type: string, listener: EventListener) => {
        listeners.set(type, listener);
      }),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("visualViewport", visualViewport);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(900);

    render(<ViewportInsetProbe />);
    expect(screen.getByTestId("inset")).toHaveTextContent("100");

    visualViewport.height = 600;
    act(() => listeners.get("resize")?.(new Event("resize")));

    expect(screen.getByTestId("inset")).toHaveTextContent("300");
  });

  it("returns zero when visualViewport is unavailable", () => {
    vi.stubGlobal("visualViewport", undefined);

    render(<ViewportInsetProbe />);

    expect(screen.getByTestId("inset")).toHaveTextContent("0");
  });
});
