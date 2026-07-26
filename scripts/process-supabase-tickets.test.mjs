import { describe, expect, it } from "vitest";

import {
  calculateObservedPrice,
  normalizeExtraction,
} from "./process-supabase-tickets.mjs";

describe("process Supabase tickets helpers", () => {
  it("normalizes extraction tickets and filters unusable rows", () => {
    expect(
      normalizeExtraction({
        tickets: [
          {
            id: " ticket-1 ",
            purchased_at: "2026-07-25T20:10:00+02:00",
            canonicalProducts: [
              {
                client_id: " new-platanos ",
                name: " Plátanos ",
                normalized_name: " plátanos ",
                comparison_unit: "kg",
              },
              {
                client_id: "",
                name: "Sin id",
                comparison_unit: "kg",
              },
            ],
            lines: [
              {
                line_index: "2",
                raw_text: " PLATANO 1,20 ",
                product_name: " Plátanos ",
                canonical_product_id: " new-platanos ",
                quantity: " 1 kg ",
                unit_price: "1,2",
                total_price: "1.20",
                original_total_price: "",
                discount_total: null,
                needs_review: false,
                review_reason: "",
              },
              {
                raw_text: "",
                product_name: "",
              },
            ],
          },
          {
            id: "ticket-empty",
            lines: [],
          },
        ],
      }),
    ).toEqual([
      {
        id: "ticket-1",
        purchased_at: "2026-07-25T20:10:00+02:00",
        canonicalProducts: [
          {
            client_id: "new-platanos",
            name: "Plátanos",
            normalized_name: "plátanos",
            comparison_unit: "kg",
          },
        ],
        lines: [
          {
            line_index: 2,
            raw_text: "PLATANO 1,20",
            product_name: "Plátanos",
            canonical_product_id: "new-platanos",
            quantity: "1 kg",
            unit_price: 1.2,
            total_price: 1.2,
            original_total_price: null,
            discount_total: null,
            needs_review: false,
            review_reason: "",
          },
        ],
      },
    ]);
  });

  it("normalizes partial errors into review lines", () => {
    expect(
      normalizeExtraction({
        tickets: [
          {
            id: "ticket-review",
            lines: [
              {
                raw_text: "LINEA DUDOSA",
                unit_price: -1,
                total_price: "abc",
                needs_review: true,
                review_reason: "No se identifica producto",
              },
            ],
          },
        ],
      })[0]?.lines[0],
    ).toMatchObject({
      raw_text: "LINEA DUDOSA",
      unit_price: null,
      total_price: null,
      needs_review: true,
      review_reason: "No se identifica producto",
    });
  });

  it("uses original price for discounted unit prices", () => {
    expect(
      calculateObservedPrice({
        unit_price: 1.6,
        total_price: 3.2,
        original_total_price: 4,
      }),
    ).toBe(2);
  });

  it("falls back to total prices when unit price is missing", () => {
    expect(
      calculateObservedPrice({
        unit_price: null,
        total_price: 3.2,
        original_total_price: 4,
      }),
    ).toBe(4);
    expect(
      calculateObservedPrice({
        unit_price: null,
        total_price: 3.2,
        original_total_price: null,
      }),
    ).toBe(3.2);
  });
});
