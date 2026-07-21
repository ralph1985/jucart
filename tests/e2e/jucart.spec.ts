import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function resetJucartStorage(page: Page) {
  await page.goto("/");
  await page.evaluate(async () => {
    window.localStorage.clear();

    await new Promise<void>((resolve, reject) => {
      const request = window.indexedDB.deleteDatabase("jucart");

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Jucart" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Añadir producto" }),
  ).toBeEnabled();
}

async function addShoppingProduct(page: Page, name: string) {
  await page.getByRole("button", { name: "Añadir producto" }).click();

  const dialog = page.getByRole("dialog", { name: "Añadir producto" });

  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: "Producto" }).fill(name);
  await dialog.getByRole("button", { name: "Añadir" }).click();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await waitForStoredShoppingProduct(page, name);
}

async function createShoppingList(page: Page, name: string) {
  await page.getByRole("button", { name: "Gestionar listas" }).click();
  await page.getByRole("button", { name: "Crear lista" }).click();

  const dialog = page.getByRole("dialog", { name: "Crear lista" });

  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Nueva lista").fill(name);
  await dialog.getByRole("button", { name: "Crear" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByLabel(`Nombre de ${name}`)).toHaveValue(name);
}

async function waitForStoredShoppingProduct(page: Page, name: string) {
  await page.waitForFunction(async (productName) => {
    return await new Promise<boolean>((resolve) => {
      const openRequest = window.indexedDB.open("jucart");

      openRequest.onerror = () => resolve(false);
      openRequest.onsuccess = () => {
        const database = openRequest.result;
        const transaction = database.transaction("shoppingItems", "readonly");
        const getAllRequest = transaction.objectStore("shoppingItems").getAll();

        getAllRequest.onerror = () => resolve(false);
        getAllRequest.onsuccess = () => {
          const products = getAllRequest.result as Array<{ name?: string }>;

          resolve(products.some((product) => product.name === productName));
          database.close();
        };
      };
    });
  }, name);
}

test.beforeEach(async ({ page }) => {
  await resetJucartStorage(page);
});

test("loads the local app shell", async ({ page }) => {
  await expect(
    page.getByText(/^(Local|Sincronizando|Sin conexión)$/),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Navegación principal" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Gestionar listas" }),
  ).toBeVisible();
});

test("adds, purchases and restores a shopping product", async ({ page }) => {
  await addShoppingProduct(page, "Leche e2e");

  await expect(page.getByText("Leche e2e")).toBeVisible();

  await page
    .getByRole("button", { name: "Marcar Leche e2e como comprado" })
    .click();

  await expect(
    page.getByRole("button", { name: "Devolver Leche e2e a pendientes" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Devolver Leche e2e a pendientes" })
    .click();

  await expect(
    page.getByRole("button", { name: "Marcar Leche e2e como comprado" }),
  ).toBeVisible();
});

test("keeps local products after reloading", async ({ page }) => {
  await addShoppingProduct(page, "Pan e2e");
  await expect(page.getByText("Pan e2e")).toBeVisible();

  await page.reload();

  await expect(page.getByText("Pan e2e")).toBeVisible();
});

test("adds a freezer product from the bottom sheet", async ({ page }) => {
  await page.getByRole("button", { name: "Congelador" }).click();
  await page.getByRole("button", { name: "Añadir producto congelado" }).click();

  const dialog = page.getByRole("dialog", {
    name: "Añadir producto congelado",
  });

  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Producto").fill("Lentejas e2e");
  await dialog.getByLabel("Cantidad").fill("2 raciones");
  await dialog.getByLabel("Cajón").selectOption("middle");
  await dialog.getByLabel("Congelado").fill("2026-07-01");
  await dialog.getByRole("button", { name: "Añadir" }).click();
  await dialog.getByRole("button", { name: "Cerrar", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Usar primero" }),
  ).toBeVisible();

  const useFirstPanel = page.getByLabel("Usar primero");

  await expect(useFirstPanel.getByText("Lentejas e2e")).toBeVisible();
  await expect(useFirstPanel.getByText("2 raciones")).toBeVisible();
});

test("creates a shopping list from the bottom sheet", async ({ page }) => {
  await page.getByRole("button", { name: "Gestionar listas" }).click();

  await expect(page.getByRole("heading", { name: "Listas" })).toBeVisible();
  await expect(page.getByLabel("Nueva lista")).toBeHidden();

  await page.getByRole("button", { name: "Crear lista" }).click();

  const dialog = page.getByRole("dialog", { name: "Crear lista" });

  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Nueva lista").fill("Frutería e2e");
  await dialog.getByRole("button", { name: "Crear" }).click();

  await expect(dialog).not.toBeVisible();
  await expect(page.getByLabel("Nombre de Frutería e2e")).toHaveValue(
    "Frutería e2e",
  );

  await page.getByRole("button", { name: "Lista", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Frutería e2e" }),
  ).toBeVisible();
});

test("renames, colors and reorders shopping lists", async ({ page }) => {
  await createShoppingList(page, "Frutería e2e");

  await page.getByLabel("Nombre de Frutería e2e").fill("Fruta e2e");
  await expect(page.getByLabel("Nombre de Fruta e2e")).toHaveValue("Fruta e2e");

  await page
    .getByRole("button", { name: "Poner Fruta e2e en color amber" })
    .click();
  await expect(
    page.getByRole("button", { name: "Poner Fruta e2e en color amber" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Subir Fruta e2e" }).click();

  const managedListNames = await page
    .getByLabel(/^Nombre de /)
    .evaluateAll((inputs) =>
      inputs.map((input) => (input as HTMLInputElement).value),
    );

  expect(managedListNames.at(-2)).toBe("Fruta e2e");
  expect(managedListNames.at(-1)).toBe("General");

  await page.getByRole("button", { name: "Lista", exact: true }).click();

  const boardListNames = await page
    .getByRole("region", { name: "Lista por secciones" })
    .getByRole("heading", { level: 2 })
    .evaluateAll((headings) =>
      headings.map((heading) =>
        heading.textContent?.replace(/·\s*\d+/, "").trim(),
      ),
    );

  expect(boardListNames.at(-2)).toBe("Fruta e2e");
  expect(boardListNames.at(-1)).toBe("General");

  const fruitColumn = page.getByRole("article", { name: /Fruta e2e/ });

  await expect(fruitColumn).toBeVisible();
  await expect(fruitColumn).toHaveClass(/sectionColoramber/);
});

test("removes a shopping product and restores it with undo", async ({
  page,
}) => {
  await addShoppingProduct(page, "Huevos e2e");

  await page.getByRole("button", { name: "Eliminar Huevos e2e" }).click();

  await expect(page.getByText("Producto borrado.")).toBeVisible();
  await expect(page.getByText("Huevos e2e")).toBeHidden();

  await page.getByRole("button", { name: "Deshacer" }).click();

  await expect(page.getByText("Producto borrado.")).toBeHidden();
  await expect(page.getByText("Huevos e2e")).toBeVisible();
});

test("edits a shopping product name, quantity and list", async ({ page }) => {
  await addShoppingProduct(page, "Leche e2e");

  await page.getByRole("button", { name: "Editar Leche e2e" }).click();

  const dialog = page.getByRole("dialog", { name: "Editar Leche e2e" });

  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Producto").fill("Yogur e2e");
  await dialog.getByLabel("Cantidad").fill("2 packs");
  await dialog.getByLabel("Sección").selectOption("farmacia");
  await dialog.getByRole("button", { name: "Guardar" }).click();

  await expect(dialog).toBeHidden();

  const farmaciaColumn = page.getByRole("article", { name: /Farmacia/ });

  await expect(farmaciaColumn.getByText("Yogur e2e")).toBeVisible();
  await expect(farmaciaColumn.getByText("2 packs")).toBeVisible();
  await expect(
    page.getByRole("article", { name: /Mercadona/ }).getByText("Leche e2e"),
  ).toBeHidden();
});

test("shows recent shopping actions in history", async ({ page }) => {
  await addShoppingProduct(page, "Arroz e2e");
  await page
    .getByRole("button", { name: "Marcar Arroz e2e como comprado" })
    .click();

  await page.getByRole("button", { name: "Historial" }).click();

  await expect(page.getByRole("heading", { name: "Historial" })).toBeVisible();
  await expect(page.getByText("Producto añadido")).toBeVisible();
  await expect(page.getByText("Marcado como comprado")).toBeVisible();
  await expect(page.getByText("Arroz e2e")).toHaveCount(2);
  await expect(page.getByText("Mercadona · Rafa")).toHaveCount(2);
});
