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
