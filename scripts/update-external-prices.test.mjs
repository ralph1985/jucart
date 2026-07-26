import { describe, expect, it, vi } from "vitest";
import {
  buildExternalObservationRow,
  chooseBestCandidate,
  fetchMercadonaCandidates,
  flattenMercadonaProducts,
  mapMercadonaProductToCandidate,
  selectActiveCanonicalProducts,
  shouldInsertExternalObservation,
  updateExternalPrices,
} from "./update-external-prices.mjs";

const config = {
  anonKey: "anon-key",
  listId: "00000000-0000-4000-8000-000000000001",
  url: "https://example.supabase.co",
};

describe("external price update helpers", () => {
  it("selects only canonical products used by active shopping items", () => {
    const products = selectActiveCanonicalProducts(
      [
        { canonical_product_id: "canonical-platanos" },
        { canonical_product_id: null },
        { canonical_product_id: "canonical-leche" },
      ],
      [
        {
          id: "canonical-platanos",
          name: "Plátanos",
          normalized_name: "platanos",
          comparison_unit: "kg",
        },
        {
          id: "canonical-arroz",
          name: "Arroz",
          normalized_name: "arroz",
          comparison_unit: "unit",
        },
      ],
    );

    expect(products.map((product) => product.id)).toEqual([
      "canonical-platanos",
    ]);
  });

  it("omits candidates with a mismatched comparison unit", () => {
    expect(
      chooseBestCandidate(
        {
          id: "canonical-leche",
          name: "Leche",
          normalized_name: "leche",
          comparison_unit: "l",
        },
        [
          {
            comparisonUnit: "unit",
            externalProductId: "leche-pack",
            externalProductUrl: null,
            normalizedName: "leche",
            observedPrice: 6,
            priceKind: "total",
            productName: "Leche pack",
            quantity: "pack",
            totalPrice: 6,
          },
        ],
      ),
    ).toBeUndefined();
  });

  it("builds external observation rows and skips unchanged prices", () => {
    const nextRow = buildExternalObservationRow({
      candidate: {
        comparisonUnit: "kg",
        externalProductId: "123",
        externalProductUrl: "https://example.com/products/123",
        normalizedName: "platanos",
        observedPrice: 1.95,
        priceKind: "unit",
        productName: "Plátanos",
        quantity: "kg",
        totalPrice: 1.95,
      },
      listId: config.listId,
      now: "2026-07-26T12:00:00.000Z",
      product: {
        id: "canonical-platanos",
        name: "Plátanos",
        comparison_unit: "kg",
      },
      provider: { id: "mercadona", sectionId: "mercadona" },
    });

    expect(nextRow).toMatchObject({
      canonical_product_id: "canonical-platanos",
      external_product_id: "123",
      external_provider: "mercadona",
      observed_price: 1.95,
      source: "external",
      ticket_id: null,
      ticket_line_id: null,
    });
    expect(
      shouldInsertExternalObservation({ observed_price: 1.95 }, nextRow),
    ).toBe(false);
    expect(
      shouldInsertExternalObservation({ observed_price: 2.1 }, nextRow),
    ).toBe(true);
  });

  it("flattens Mercadona category payloads into clear candidates", () => {
    const [candidate] = flattenMercadonaProducts({
      categories: [
        {
          products: [
            {
              id: 123,
              display_name: "Plátanos",
              price_instructions: {
                reference_format: "kg",
                reference_price: "1.95",
                unit_price: "1.95",
              },
            },
          ],
        },
      ],
    }).map(mapMercadonaProductToCandidate);

    expect(candidate).toMatchObject({
      comparisonUnit: "kg",
      externalProductId: "123",
      normalizedName: "platanos",
      observedPrice: 1.95,
    });
  });

  it("loads Mercadona products from subcategories and maps reference units", async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (url === "https://tienda.mercadona.es/api/categories/") {
        return createJsonResponse({
          results: [
            {
              id: 12,
              name: "Aceite",
              categories: [
                { id: 112, name: "Aceite, vinagre y sal", published: true },
              ],
            },
          ],
        });
      }

      if (url === "https://tienda.mercadona.es/api/categories/112") {
        return createJsonResponse({
          id: 112,
          categories: [
            {
              id: 420,
              products: [
                {
                  id: "69586",
                  display_name: "Zanahorias",
                  price_instructions: {
                    reference_format: "kg",
                    reference_price: "1.200",
                    size_format: "kg",
                    unit_price: "1.20",
                    unit_size: 1,
                  },
                  share_url:
                    "https://tienda.mercadona.es/product/69586/zanahorias-paquete",
                },
              ],
            },
          ],
        });
      }

      if (url === "https://tienda.mercadona.es/api/categories/12") {
        return createJsonResponse({ id: 12, categories: [] });
      }

      throw new Error(`Unexpected Mercadona URL: ${url}`);
    });

    const candidates = await fetchMercadonaCandidates(
      "https://tienda.mercadona.es/api/categories/",
      fetchImpl,
    );

    expect(candidates).toEqual([
      expect.objectContaining({
        comparisonUnit: "kg",
        externalProductId: "69586",
        observedPrice: 1.2,
        productName: "Zanahorias",
        quantity: "1 kg",
      }),
    ]);
  });

  it("uses conservative external aliases for Mercadona names", () => {
    expect(
      chooseBestCandidate(
        {
          id: "canonical-platanos",
          name: "Plátanos",
          normalized_name: "platanos",
          comparison_unit: "kg",
        },
        [
          {
            comparisonUnit: "kg",
            externalProductId: "3824",
            externalProductUrl: "https://tienda.mercadona.es/product/3824",
            normalizedName: "banana",
            observedPrice: 1.55,
            priceKind: "unit",
            productName: "Banana",
            quantity: "0.19 kg",
            totalPrice: 0.29,
          },
        ],
      ),
    ).toMatchObject({
      externalProductId: "3824",
      observedPrice: 1.55,
    });
  });

  it("does not match broad one-word products by partial substrings", () => {
    expect(
      chooseBestCandidate(
        {
          id: "canonical-agua",
          name: "Agua",
          normalized_name: "agua",
          comparison_unit: "l",
        },
        [
          {
            comparisonUnit: "l",
            externalProductId: "smoothie-aguacate",
            externalProductUrl: null,
            normalizedName: "smoothie veggie aguacate mango espinaca",
            observedPrice: 7.2,
            priceKind: "unit",
            productName: "Smoothie veggie aguacate",
            quantity: "0.25 l",
            totalPrice: 1.8,
          },
        ],
      ),
    ).toBeUndefined();
  });

  it("inserts external observations only when provider price changes", async () => {
    const insertedBodies = [];
    const fetchImpl = vi.fn(async (url, options) => {
      if (url.includes("shopping_items")) {
        return createJsonResponse([
          { canonical_product_id: "canonical-platanos" },
          { canonical_product_id: "canonical-leche" },
        ]);
      }

      if (url.includes("shopping_canonical_products")) {
        return createJsonResponse([
          {
            id: "canonical-platanos",
            name: "Plátanos",
            normalized_name: "platanos",
            comparison_unit: "kg",
          },
          {
            id: "canonical-leche",
            name: "Leche",
            normalized_name: "leche",
            comparison_unit: "l",
          },
        ]);
      }

      if (url.includes("shopping_price_observations") && !options?.method) {
        return createJsonResponse([
          {
            source: "external",
            external_provider: "mercadona",
            canonical_product_id: "canonical-platanos",
            comparison_unit: "kg",
            observed_price: 1.8,
            observed_at: "2026-07-25T12:00:00.000Z",
          },
          {
            source: "external",
            external_provider: "mercadona",
            canonical_product_id: "canonical-leche",
            comparison_unit: "l",
            observed_price: 1.2,
            observed_at: "2026-07-25T12:00:00.000Z",
          },
        ]);
      }

      if (
        url.includes("shopping_price_observations") &&
        options?.method === "POST"
      ) {
        insertedBodies.push(JSON.parse(options.body));
        return createJsonResponse([]);
      }

      throw new Error(`Unexpected URL: ${url}`);
    });
    const providers = [
      {
        enabled: true,
        id: "mercadona",
        sectionId: "mercadona",
        async search(product) {
          return [
            {
              comparisonUnit: product.comparison_unit,
              externalProductId: `${product.id}-external`,
              externalProductUrl: null,
              normalizedName: product.normalized_name,
              observedPrice: product.id === "canonical-platanos" ? 1.8 : 1.3,
              priceKind: "unit",
              productName: product.name,
              quantity: product.comparison_unit,
              totalPrice: null,
            },
          ];
        },
      },
    ];

    const report = await updateExternalPrices({
      config,
      fetchImpl,
      now: "2026-07-26T12:00:00.000Z",
      providers,
    });

    expect(report).toMatchObject({
      errors: 0,
      inserted: 1,
      skipped: 0,
      unchanged: 1,
    });
    expect(insertedBodies).toHaveLength(1);
    expect(insertedBodies[0]).toHaveLength(1);
    expect(insertedBodies[0][0]).toMatchObject({
      canonical_product_id: "canonical-leche",
      external_provider: "mercadona",
      observed_price: 1.3,
    });
  });
});

function createJsonResponse(data) {
  return {
    ok: true,
    async json() {
      return data;
    },
  };
}
