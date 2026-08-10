import type { TouchEvent } from "react";
import { useRef, useState } from "react";

type PullRefreshGesture = {
  pointerId: number;
  scrollContainer: HTMLElement | null;
  startX: number;
  startY: number;
};

type UsePullToRefreshGestureOptions = {
  enabled: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
};

function getScrollContainer(target: EventTarget | null) {
  let element = target instanceof HTMLElement ? target : null;

  while (element && element !== document.body) {
    const computedStyle = window.getComputedStyle(element);
    const canScrollVertically =
      (computedStyle.overflowY === "auto" ||
        computedStyle.overflowY === "scroll") &&
      element.scrollHeight > element.clientHeight;

    if (canScrollVertically) {
      return element;
    }

    element = element.parentElement;
  }

  return document.scrollingElement instanceof HTMLElement
    ? document.scrollingElement
    : null;
}

function isExcludedTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        "button, input, select, textarea, [role=dialog], [data-pull-refresh-ignore]",
      ),
    )
  );
}

export function usePullToRefreshGesture({
  enabled,
  isRefreshing,
  onRefresh,
}: UsePullToRefreshGestureOptions) {
  const [distance, setDistance] = useState(0);
  const gestureRef = useRef<PullRefreshGesture | null>(null);
  const rawDistanceRef = useRef(0);

  function finishGesture() {
    gestureRef.current = null;
    rawDistanceRef.current = 0;
    setDistance(0);
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    const touch = event.touches[0];

    if (!touch || !enabled || isRefreshing || isExcludedTarget(event.target)) {
      return;
    }

    const scrollContainer = getScrollContainer(event.target);

    if (!scrollContainer || scrollContainer.scrollTop > 0) {
      return;
    }

    gestureRef.current = {
      pointerId: touch.identifier,
      startX: touch.clientX,
      startY: touch.clientY,
      scrollContainer,
    };
  }

  function handleTouchMove(event: TouchEvent<HTMLElement>) {
    const touch = event.touches[0];

    if (!touch) {
      return;
    }

    const gesture = gestureRef.current;

    if (!gesture || gesture.pointerId !== touch.identifier) {
      return;
    }

    if (!gesture.scrollContainer || gesture.scrollContainer.scrollTop > 0) {
      finishGesture();
      return;
    }

    const rawDistance = Math.max(0, touch.clientY - gesture.startY);
    const horizontalDistance = Math.abs(touch.clientX - gesture.startX);

    if (rawDistance < 12) {
      return;
    }

    if (horizontalDistance > rawDistance) {
      finishGesture();
      return;
    }

    event.preventDefault();
    rawDistanceRef.current = rawDistance;
    setDistance(Math.min(96, rawDistance * 0.48));
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    const touch = event.changedTouches[0];
    const gesture = gestureRef.current;

    if (!touch || !gesture || gesture.pointerId !== touch.identifier) {
      return;
    }

    const shouldRefresh = rawDistanceRef.current >= 72;
    finishGesture();

    if (shouldRefresh) {
      onRefresh();
    }
  }

  return {
    distance,
    handleTouchEnd,
    handleTouchMove,
    handleTouchStart,
    reset: finishGesture,
  };
}
