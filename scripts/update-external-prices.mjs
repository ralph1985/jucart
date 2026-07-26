#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const repoRoot = path.resolve(scriptDir, "..");
let config;

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    fail(error instanceof Error ? error.message : String(error));
  });
}

async function main() {
  config = await readSupabaseConfig();
  const report = await updateExternalPrices({
    config,
    fetchImpl: fetch,
    now: new Date().toISOString(),
    providers: createExternalPriceProviders(process.env),
  });

  console.log(
    `External prices: ${report.inserted} inserted, ${report.unchanged} unchanged, ${report.skipped} skipped, ${report.errors} errors.`,
  );

  for (const entry of report.entries) {
    console.log(
      `${entry.providerId} · ${entry.canonicalProductName}: ${entry.status}${
        entry.reason ? ` · ${entry.reason}` : ""
      }`,
    );
  }
}

async function updateExternalPrices({ config, fetchImpl, now, providers }) {
  const [items, canonicalProducts, observations] = await Promise.all([
    fetchRows({
      config,
      fetchImpl,
      tableName: "shopping_items",
      filterColumn: "list_id",
      filterValue: config.listId,
    }),
    fetchRows({
      config,
      fetchImpl,
      tableName: "shopping_canonical_products",
      filterColumn: "list_id",
      filterValue: config.listId,
      order: "normalized_name.asc",
    }),
    fetchRows({
      config,
      fetchImpl,
      tableName: "shopping_price_observations",
      filterColumn: "list_id",
      filterValue: config.listId,
      order: "observed_at.desc",
    }),
  ]);
  const activeProducts = selectActiveCanonicalProducts(
    items,
    canonicalProducts,
  );
  const rowsToInsert = [];
  const entries = [];

  for (const product of activeProducts) {
    for (const provider of providers) {
      try {
        const candidates = await provider.search(product, fetchImpl);
        const candidate = chooseBestCandidate(product, candidates);

        if (!candidate) {
          entries.push({
            canonicalProductName: product.name,
            providerId: provider.id,
            reason: "Sin coincidencia clara.",
            status: "skipped",
          });
          continue;
        }

        const row = buildExternalObservationRow({
          candidate,
          listId: config.listId,
          now,
          product,
          provider,
        });
        const latestObservation = findLatestExternalObservation(
          observations,
          provider.id,
          product.id,
          candidate.comparisonUnit,
        );

        if (!shouldInsertExternalObservation(latestObservation, row)) {
          entries.push({
            canonicalProductName: product.name,
            providerId: provider.id,
            reason: "Precio sin cambios.",
            status: "unchanged",
          });
          continue;
        }

        rowsToInsert.push(row);
        observations.unshift(row);
        entries.push({
          canonicalProductName: product.name,
          providerId: provider.id,
          reason: candidate.productName,
          status: "inserted",
        });
      } catch (error) {
        entries.push({
          canonicalProductName: product.name,
          providerId: provider.id,
          reason: error instanceof Error ? error.message : String(error),
          status: "error",
        });
      }
    }
  }

  await insertRows({
    config,
    fetchImpl,
    rows: rowsToInsert,
    tableName: "shopping_price_observations",
  });

  return {
    entries,
    errors: entries.filter((entry) => entry.status === "error").length,
    inserted: rowsToInsert.length,
    skipped: entries.filter((entry) => entry.status === "skipped").length,
    unchanged: entries.filter((entry) => entry.status === "unchanged").length,
  };
}

function createExternalPriceProviders(env) {
  return [
    createMercadonaProvider(env),
    createAlcampoProvider(env),
    createGenericFallbackProvider(env),
  ].filter((provider) => provider.enabled);
}

function createMercadonaProvider(env) {
  const catalogUrl =
    env.JUCART_MERCADONA_CATALOG_URL ??
    "https://tienda.mercadona.es/api/categories/";
  let cachedCandidates = null;

  return {
    enabled: true,
    id: "mercadona",
    sectionId: "mercadona",
    async search(product, fetchImpl) {
      if (!cachedCandidates) {
        cachedCandidates = await fetchMercadonaCandidates(
          catalogUrl,
          fetchImpl,
        );
      }

      return cachedCandidates;
    },
  };
}

function createAlcampoProvider(env) {
  const searchUrl = env.JUCART_ALCAMPO_SEARCH_URL;

  return {
    enabled: Boolean(searchUrl),
    id: "alcampo",
    sectionId: "alcampo",
    async search(product, fetchImpl) {
      return fetchGenericSearchCandidates({
        apiKey: env.JUCART_ALCAMPO_API_KEY,
        fetchImpl,
        providerId: "alcampo",
        query: product.name,
        searchUrl,
      });
    },
  };
}

function createGenericFallbackProvider(env) {
  const searchUrl = env.JUCART_PRICE_PROVIDER_SEARCH_URL;

  return {
    enabled: Boolean(searchUrl),
    id: env.JUCART_PRICE_PROVIDER_ID || "external-provider",
    sectionId: env.JUCART_PRICE_PROVIDER_SECTION_ID || "external",
    async search(product, fetchImpl) {
      return fetchGenericSearchCandidates({
        apiKey: env.JUCART_PRICE_PROVIDER_API_KEY,
        fetchImpl,
        providerId: this.id,
        query: product.name,
        searchUrl,
      });
    },
  };
}

async function fetchGenericSearchCandidates({
  apiKey,
  fetchImpl,
  providerId,
  query,
  searchUrl,
}) {
  const url = searchUrl.replace("{query}", encodeURIComponent(query));
  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`${providerId} returned ${response.status}`);
  }

  return flattenGenericProducts(await response.json()).map((item) =>
    mapGenericProductToCandidate(item),
  );
}

function selectActiveCanonicalProducts(items, canonicalProducts) {
  const activeCanonicalProductIds = new Set(
    items
      .map((item) => item.canonical_product_id)
      .filter((canonicalProductId) => typeof canonicalProductId === "string"),
  );

  return canonicalProducts.filter((product) =>
    activeCanonicalProductIds.has(product.id),
  );
}

function chooseBestCandidate(product, candidates) {
  const normalizedProductNames = getExternalSearchNames(product);
  const isBroadProductName =
    normalizeCatalogText(product.name).split(" ").length === 1;

  return candidates
    .filter(
      (candidate) =>
        candidate &&
        candidate.comparisonUnit === product.comparison_unit &&
        candidate.observedPrice !== null &&
        Number.isFinite(candidate.observedPrice),
    )
    .map((candidate) => ({
      candidate,
      score: Math.max(
        ...normalizedProductNames.map((normalizedProductName) =>
          getCandidateScore(normalizedProductName, candidate.normalizedName),
        ),
      ),
    }))
    .filter(
      (match) => match.score >= 2 && (!isBroadProductName || match.score >= 4),
    )
    .sort(
      (firstMatch, secondMatch) =>
        secondMatch.score - firstMatch.score ||
        firstMatch.candidate.observedPrice -
          secondMatch.candidate.observedPrice,
    )[0]?.candidate;
}

function getCandidateScore(normalizedProductName, normalizedCandidateName) {
  if (normalizedCandidateName === normalizedProductName) {
    return 5;
  }

  if (normalizedCandidateName.startsWith(`${normalizedProductName} `)) {
    return 4;
  }

  if (containsAllTokens(normalizedCandidateName, normalizedProductName)) {
    return 3;
  }

  if (containsAllTokens(normalizedProductName, normalizedCandidateName)) {
    return 2;
  }

  return 0;
}

function containsAllTokens(normalizedCandidateName, normalizedProductName) {
  const candidateTokens = new Set(normalizedCandidateName.split(" "));
  const productTokens = normalizedProductName.split(" ");

  return productTokens.every((token) => candidateTokens.has(token));
}

function getExternalSearchNames(product) {
  const normalizedName = normalizeCatalogText(product.name);
  const aliasesByName = {
    platanos: ["banana"],
    platano: ["banana"],
  };

  return [normalizedName, ...(aliasesByName[normalizedName] ?? [])];
}

function buildExternalObservationRow({
  candidate,
  listId,
  now,
  product,
  provider,
}) {
  const priceKind = candidate.priceKind ?? "unit";

  return {
    list_id: listId,
    source: "external",
    ticket_id: null,
    ticket_line_id: null,
    external_provider: provider.id,
    external_product_id: candidate.externalProductId,
    external_product_url: candidate.externalProductUrl,
    canonical_product_id: product.id,
    section_id: provider.sectionId,
    observed_at: now,
    product_name: candidate.productName,
    quantity: candidate.quantity,
    comparison_unit: candidate.comparisonUnit,
    price_kind: priceKind,
    observed_price: candidate.observedPrice,
    unit_price: priceKind === "unit" ? candidate.observedPrice : null,
    total_price: candidate.totalPrice,
    original_total_price: null,
    discount_total: null,
  };
}

function shouldInsertExternalObservation(latestObservation, nextRow) {
  if (!latestObservation) {
    return true;
  }

  return (
    Number(latestObservation.observed_price) !== Number(nextRow.observed_price)
  );
}

function findLatestExternalObservation(
  observations,
  providerId,
  canonicalProductId,
  comparisonUnit,
) {
  return observations.find(
    (observation) =>
      observation.source === "external" &&
      observation.external_provider === providerId &&
      observation.canonical_product_id === canonicalProductId &&
      observation.comparison_unit === comparisonUnit,
  );
}

function flattenMercadonaProducts(catalog) {
  const products = [];
  const stack = Array.isArray(catalog) ? [...catalog] : [catalog];

  while (stack.length > 0) {
    const entry = stack.pop();

    if (!entry || typeof entry !== "object") {
      continue;
    }

    if (Array.isArray(entry.products)) {
      products.push(...entry.products);
    }

    for (const key of ["categories", "subcategories", "children"]) {
      if (Array.isArray(entry[key])) {
        stack.push(...entry[key]);
      }
    }
  }

  return products;
}

async function fetchMercadonaCandidates(catalogUrl, fetchImpl) {
  const catalog = await fetchMercadonaJson(catalogUrl, fetchImpl);
  const categoryIds = extractMercadonaCategoryIds(catalog);
  const categoryPayloads = [];

  for (const categoryId of categoryIds) {
    try {
      categoryPayloads.push(
        await fetchMercadonaJson(
          new URL(String(categoryId), ensureTrailingSlash(catalogUrl)).href,
          fetchImpl,
        ),
      );
    } catch (error) {
      if (!isSkippableMercadonaCategoryError(error)) {
        throw error;
      }
    }
  }
  const products = [
    ...flattenMercadonaProducts(catalog),
    ...categoryPayloads.flatMap(flattenMercadonaProducts),
  ];
  const productsById = new Map(
    products
      .filter((product) => product?.id)
      .map((product) => [String(product.id), product]),
  );

  return [...productsById.values()].map(mapMercadonaProductToCandidate);
}

async function fetchMercadonaJson(url, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Mercadona returned ${response.status}`);
  }

  return response.json();
}

function isSkippableMercadonaCategoryError(error) {
  return (
    error instanceof Error &&
    (error.message.includes("Mercadona returned 403") ||
      error.message.includes("Mercadona returned 404"))
  );
}

function extractMercadonaCategoryIds(catalog) {
  const ids = new Set();
  const stack = Array.isArray(catalog)
    ? [...catalog]
    : Array.isArray(catalog?.results)
      ? [...catalog.results]
      : [catalog];

  while (stack.length > 0) {
    const entry = stack.pop();

    if (!entry || typeof entry !== "object") {
      continue;
    }

    if (
      typeof entry.id !== "undefined" &&
      entry.published === true &&
      !Array.isArray(entry.products)
    ) {
      ids.add(entry.id);
    }

    for (const key of ["categories", "subcategories", "children"]) {
      if (Array.isArray(entry[key])) {
        stack.push(...entry[key]);
      }
    }
  }

  return [...ids];
}

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function mapMercadonaProductToCandidate(product) {
  const priceInstructions = product.price_instructions ?? {};
  const productName = String(
    product.display_name ?? product.name ?? product.slug ?? "",
  ).trim();
  const referenceFormat = String(
    priceInstructions.reference_format ??
      priceInstructions.size_format ??
      priceInstructions.unit_name ??
      "",
  );
  const observedPrice = parsePrice(
    priceInstructions.reference_price ??
      priceInstructions.bulk_price ??
      priceInstructions.unit_price ??
      product.price ??
      product.unit_price,
  );

  return {
    comparisonUnit: normalizeComparisonUnitFromText(
      referenceFormat || productName,
    ),
    externalProductId: String(product.id ?? product.slug ?? productName),
    externalProductUrl:
      product.share_url ??
      product.product_share_url ??
      (product.id ? `https://tienda.mercadona.es/product/${product.id}` : null),
    normalizedName: normalizeCatalogText(productName),
    observedPrice,
    priceKind: "unit",
    productName,
    quantity: formatMercadonaQuantity(priceInstructions),
    totalPrice: parsePrice(priceInstructions.unit_price ?? product.price),
  };
}

function formatMercadonaQuantity(priceInstructions) {
  const unitSize = priceInstructions.unit_size;
  const sizeFormat = priceInstructions.size_format;
  const unitName = priceInstructions.unit_name;
  const totalUnits = priceInstructions.total_units;

  if (totalUnits && unitName) {
    return `${totalUnits} ${unitName}`;
  }

  if (unitSize && sizeFormat) {
    return `${unitSize} ${sizeFormat}`;
  }

  return unitName ?? null;
}

function flattenGenericProducts(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  for (const key of ["products", "items", "results", "hits"]) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }
  }

  return [];
}

function mapGenericProductToCandidate(product) {
  const productName = String(
    product.name ??
      product.display_name ??
      product.title ??
      product.label ??
      "",
  ).trim();
  const unitText = String(
    product.unit ?? product.unit_name ?? product.measure ?? "",
  );
  const observedPrice = parsePrice(
    product.unit_price ??
      product.price_per_unit ??
      product.price ??
      product.amount,
  );

  return {
    comparisonUnit: normalizeComparisonUnitFromText(unitText || productName),
    externalProductId: String(
      product.id ?? product.sku ?? product.ean ?? productName,
    ),
    externalProductUrl: product.url ?? product.product_url ?? null,
    normalizedName: normalizeCatalogText(productName),
    observedPrice,
    priceKind: unitText ? "unit" : "total",
    productName,
    quantity: unitText || null,
    totalPrice: parsePrice(product.price ?? product.amount),
  };
}

function normalizeComparisonUnitFromText(value) {
  const normalizedValue = normalizeCatalogText(value);

  if (/\bkg\b|kilo|kilogram/.test(normalizedValue)) {
    return "kg";
  }

  if (/^l$|\bl\b|litro/.test(normalizedValue)) {
    return "l";
  }

  return "unit";
}

function parsePrice(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.replace(",", ".").match(/\d+(?:\.\d+)?/u)?.[0];

  return normalizedValue ? Number(normalizedValue) : null;
}

function normalizeCatalogText(value) {
  return String(value)
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

async function readSupabaseConfig() {
  const env = await readEnvFile(path.join(repoRoot, ".env.local"));
  const url = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  const listId = process.env.VITE_SUPABASE_LIST_ID || env.VITE_SUPABASE_LIST_ID;

  if (!url || !anonKey || !listId) {
    fail(
      "Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_LIST_ID.",
    );
  }

  return { anonKey, listId, url };
}

async function readEnvFile(filePath) {
  try {
    return parseEnv(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

function parseEnv(contents) {
  const values = {};

  for (const line of contents.split(/\r?\n/u)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const match = trimmedLine.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    values[key] = unquoteEnvValue(rawValue.trim());
  }

  return values;
}

function unquoteEnvValue(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

async function fetchRows({
  config,
  fetchImpl,
  filterColumn,
  filterValue,
  order,
  tableName,
}) {
  const params = new URLSearchParams({ select: "*" });

  if (filterColumn && filterValue) {
    params.set(filterColumn, `eq.${filterValue}`);
  }

  if (order) {
    params.set("order", order);
  }

  const response = await fetchImpl(
    `${config.url}/rest/v1/${tableName}?${params.toString()}`,
    {
      headers: supabaseHeaders(config),
    },
  );

  if (!response.ok) {
    throw new Error(`Could not fetch ${tableName}: ${response.status}`);
  }

  return response.json();
}

async function insertRows({ config, fetchImpl, rows, tableName }) {
  if (rows.length === 0) {
    return;
  }

  const response = await fetchImpl(`${config.url}/rest/v1/${tableName}`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(config),
      Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    throw new Error(`Could not insert ${tableName}: ${response.status}`);
  }
}

function supabaseHeaders(config) {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${config.anonKey}`,
    "Content-Type": "application/json",
  };
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

export {
  buildExternalObservationRow,
  chooseBestCandidate,
  createExternalPriceProviders,
  fetchMercadonaCandidates,
  flattenMercadonaProducts,
  mapMercadonaProductToCandidate,
  normalizeCatalogText,
  selectActiveCanonicalProducts,
  shouldInsertExternalObservation,
  updateExternalPrices,
};
