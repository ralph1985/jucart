import { fireEvent, render, screen, within } from "@testing-library/react";

import { App } from "./App";

describe("App", () => {
  it("renders the app name", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Jucart" }),
    ).toBeInTheDocument();
  });

  it("adds, toggles and removes products", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Producto"), {
      target: { value: "  Leche  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Añadir" }));

    const pendingSection = screen
      .getByRole("heading", { name: "Pendientes" })
      .closest("section");

    expect(pendingSection).not.toBeNull();
    expect(
      within(pendingSection as HTMLElement).getByText("Leche"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Comprado" }));

    const purchasedSection = screen
      .getByRole("heading", { name: "Comprados" })
      .closest("section");

    expect(purchasedSection).not.toBeNull();
    expect(
      within(purchasedSection as HTMLElement).getByText("Leche"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pendiente" }));
    expect(
      within(pendingSection as HTMLElement).getByText("Leche"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(screen.queryByText("Leche")).not.toBeInTheDocument();
  });
});
