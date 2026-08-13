import type { UseEmblaCarouselType } from "embla-carousel-react";
import { useEffect, type RefObject } from "react";

type BoardSection = { id: string };

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
  const selectedSectionIndex = Math.max(
    sections.findIndex((section) => section.id === selectedSectionId),
    0,
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
}
