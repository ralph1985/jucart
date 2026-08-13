import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BottomSheetFrame } from "./BottomSheetFrame";

describe("BottomSheetFrame", () => {
  it("publishes the keyboard inset on the backdrop and panel", () => {
    vi.stubGlobal("visualViewport", {
      height: 600,
      offsetTop: 0,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(900);

    render(
      <BottomSheetFrame
        ariaLabelledBy="sheet-title"
        backdropRef={createRef<HTMLDivElement>()}
        onClose={vi.fn()}
        sheetRef={createRef<HTMLElement>()}
        title="Panel de prueba"
      >
        Contenido
      </BottomSheetFrame>,
    );

    expect(screen.getByRole("dialog")).toHaveStyle(
      "--sheet-keyboard-inset: 300px",
    );
    expect(screen.getByRole("dialog").parentElement).toHaveStyle(
      "--sheet-keyboard-inset: 300px",
    );
  });
});
