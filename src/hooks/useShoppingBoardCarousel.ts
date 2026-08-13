import type { UseEmblaCarouselType } from "embla-carousel-react";
import {
  useCallback,
  useEffect,
  useRef,
  type RefObject,
  type WheelEvent,
} from "react";

type BoardSection = { id: string };

const SHOPPING_BOARD_WHEEL_THRESHOLD = 64;

type UseShoppingBoardCarouselOptions<TSection extends BoardSection> = {
  api: UseEmblaCarouselType[1];
  isActive: boolean;
  onSelectSection: (sectionId: string) => void;
  sections: TSection[];
  sectionsRef: RefObject<TSection[]>;
  selectedSectionId: string;
  selectedSectionIdRef: RefObject<string>;
  shouldAnimate: () => boolean;
};

export function useShoppingBoardCarousel<TSection extends BoardSection>({
  api,
  isActive,
  onSelectSection,
  sections,
  sectionsRef,
  selectedSectionId,
  selectedSectionIdRef,
  shouldAnimate,
}: UseShoppingBoardCarouselOptions<TSection>) {
  const wheelDeltaRef = useRef(0);
  const wheelResetTimeoutRef = useRef<number | null>(null);
  const selectedSectionIndex = Math.max(
    sections.findIndex((section) => section.id === selectedSectionId),
    0,
  );

  useEffect(() => {
    return () => {
      if (wheelResetTimeoutRef.current !== null) {
        window.clearTimeout(wheelResetTimeoutRef.current);
      }
    };
  }, []);

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLElement>) => {
      const horizontalDelta = event.shiftKey
        ? event.deltaY
        : Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : 0;

      if (horizontalDelta === 0 || sections.length < 2) {
        return;
      }

      wheelDeltaRef.current += horizontalDelta;

      if (wheelResetTimeoutRef.current !== null) {
        window.clearTimeout(wheelResetTimeoutRef.current);
      }

      wheelResetTimeoutRef.current = window.setTimeout(() => {
        wheelDeltaRef.current = 0;
        wheelResetTimeoutRef.current = null;
      }, 140);

      if (Math.abs(wheelDeltaRef.current) < SHOPPING_BOARD_WHEEL_THRESHOLD) {
        return;
      }

      const currentIndex = api?.selectedScrollSnap() ?? selectedSectionIndex;
      const nextIndex = Math.min(
        Math.max(currentIndex + (wheelDeltaRef.current > 0 ? 1 : -1), 0),
        sections.length - 1,
      );

      wheelDeltaRef.current = 0;

      if (nextIndex === currentIndex || !api) {
        return;
      }

      event.preventDefault();
      api.scrollTo(nextIndex, !shouldAnimate());
    },
    [api, sections.length, selectedSectionIndex, shouldAnimate],
  );

  useEffect(() => {
    if (!api) {
      return;
    }

    const boardApi = api;

    function syncSelectedSection() {
      const nextSection = sectionsRef.current[boardApi.selectedScrollSnap()];

      if (!nextSection || nextSection.id === selectedSectionIdRef.current) {
        return;
      }

      onSelectSection(nextSection.id);
    }

    boardApi.on("select", syncSelectedSection);
    return () => {
      boardApi.off("select", syncSelectedSection);
    };
  }, [api, onSelectSection, sectionsRef, selectedSectionIdRef]);

  useEffect(() => {
    if (!api || !isActive) {
      return;
    }

    api.scrollTo(selectedSectionIndex, !shouldAnimate());
  }, [api, isActive, selectedSectionId, selectedSectionIndex, shouldAnimate]);

  useEffect(() => {
    if (!api || !isActive) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const nextSectionIndex = Math.max(
        sectionsRef.current.findIndex(
          (section) => section.id === selectedSectionIdRef.current,
        ),
        0,
      );

      api.reInit();
      api.scrollTo(nextSectionIndex, true);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [api, isActive, sections, sectionsRef, selectedSectionIdRef]);

  return { handleWheel };
}
