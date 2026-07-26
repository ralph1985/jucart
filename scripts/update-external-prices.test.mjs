import { describe, expect, it, vi } from "vitest";
import {
  buildExternalObservationRow,
  chooseBestCandidate,
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
                bulk_price: "1.95",
                bulk_unit: "kg",
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
