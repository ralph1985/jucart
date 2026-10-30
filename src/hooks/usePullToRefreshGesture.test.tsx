import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { usePullToRefreshGesture } from "./usePullToRefreshGesture";

type GestureProbeProps = {
  enabled?: boolean;
  isRefreshing?: boolean;
  onRefresh: () => void;
};

function GestureProbe({
  enabled = true,
  isRefreshing = false,
  onRefresh,
}: GestureProbeProps) {
  const gesture = usePullToRefreshGesture({
    enabled,
    isRefreshing,
    onRefresh,
  });

  return (
    <main
      data-testid="scroll-container"
      onTouchEnd={gesture.handleTouchEnd}
      onTouchMove={gesture.handleTouchMove}
      onTouchStart={gesture.handleTouchStart}
      style={{ overflowY: "auto" }}
    >
      <button type="button">Ignorar gesto</button>
      <output data-testid="distance">{gesture.distance}</output>
    </main>
  );
}

function setScrollableContainer(scrollTop = 0) {
  const container = screen.getByTestId("scroll-container");

  Object.defineProperties(container, {
    clientHeight: { configurable: true, value: 100 },
    scrollHeight: { configurable: true, value: 300 },
    scrollTop: { configurable: true, value: scrollTop, writable: true },
  });

  return container;
}

function touch(identifier: number, clientX: number, clientY: number) {
  return { clientX, clientY, identifier };
}

describe("usePullToRefreshGesture", () => {
  it("ignores disabled, refreshing, excluded and scrolled gestures", () => {
    const onRefresh = vi.fn();
    const { rerender } = render(
      <GestureProbe enabled={false} onRefresh={onRefresh} />,
    );
    const container = setScrollableContainer();

    fireEvent.touchMove(container, { touches: [] });
    fireEvent.touchStart(container, {
      touches: [touch(1, 10, 0)],
    });
    fireEvent.touchMove(container, {
      cancelable: true,
      touches: [touch(1, 10, 100)],
    });
    expect(screen.getByTestId("distance")).toHaveTextContent("0");

    rerender(<GestureProbe isRefreshing onRefresh={onRefresh} />);
    fireEvent.touchStart(container, {
      touches: [touch(2, 10, 0)],
    });
    fireEvent.touchMove(container, {
      cancelable: true,
      touches: [touch(2, 10, 100)],
    });
    expect(screen.getByTestId("distance")).toHaveTextContent("0");

    rerender(<GestureProbe onRefresh={onRefresh} />);
    fireEvent.touchStart(
      screen.getByRole("button", { name: "Ignorar gesto" }),
      {
        touches: [touch(3, 10, 0)],
      },
    );
    fireEvent.touchMove(container, {
      cancelable: true,
      touches: [touch(3, 10, 100)],
    });
    expect(screen.getByTestId("distance")).toHaveTextContent("0");

    container.scrollTop = 20;
    fireEvent.touchStart(container, {
      touches: [touch(4, 10, 0)],
    });
    fireEvent.touchMove(container, {
      cancelable: true,
      touches: [touch(4, 10, 100)],
    });
    expect(screen.getByTestId("distance")).toHaveTextContent("0");

    container.scrollTop = 0;
    fireEvent.touchStart(container, {
      touches: [touch(5, 10, 0)],
    });
    container.scrollTop = 20;
    fireEvent.touchMove(container, {
      cancelable: true,
      touches: [touch(5, 10, 100)],
    });
    expect(screen.getByTestId("distance")).toHaveTextContent("0");
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("cancels mismatched or horizontal gestures and refreshes after a long pull", () => {
    const onRefresh = vi.fn();
    render(<GestureProbe onRefresh={onRefresh} />);
    const container = setScrollableContainer();

    fireEvent.touchStart(container, {
      touches: [touch(1, 10, 0)],
    });
    fireEvent.touchMove(container, {
      cancelable: true,
      touches: [touch(2, 10, 100)],
    });
    expect(screen.getByTestId("distance")).toHaveTextContent("0");

    fireEvent.touchMove(container, {
      cancelable: true,
      touches: [touch(1, 10, 8)],
    });
    expect(screen.getByTestId("distance")).toHaveTextContent("0");

    fireEvent.touchMove(container, {
      cancelable: true,
      touches: [touch(1, 40, 20)],
    });
    expect(screen.getByTestId("distance")).toHaveTextContent("0");

    fireEvent.touchStart(container, {
      touches: [touch(3, 10, 0)],
    });
    fireEvent.touchMove(container, {
      cancelable: true,
      touches: [touch(3, 10, 40)],
    });
    expect(screen.getByTestId("distance")).toHaveTextContent("19.2");
    fireEvent.touchEnd(container, {
      changedTouches: [touch(3, 10, 40)],
    });
    expect(onRefresh).not.toHaveBeenCalled();
    expect(screen.getByTestId("distance")).toHaveTextContent("0");

    fireEvent.touchStart(container, {
      touches: [touch(4, 10, 0)],
    });
    fireEvent.touchMove(container, {
      cancelable: true,
      touches: [touch(4, 10, 200)],
    });
    expect(screen.getByTestId("distance")).toHaveTextContent("96");
    fireEvent.touchEnd(container, {
      changedTouches: [touch(4, 10, 200)],
    });

    expect(onRefresh).toHaveBeenCalledOnce();
    expect(screen.getByTestId("distance")).toHaveTextContent("0");
  });
});
