#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const source = path.resolve(
  process.argv[process.argv.indexOf("--source") + 1] || "Comidas.xlsx",
);
const jsonOutput = process.argv.includes("--json");

if (!existsSync(source)) {
  console.error(`No existe el Excel: ${source}`);
  process.exit(1);
}

function readZipEntry(entry) {
  try {
    return execFileSync("unzip", ["-p", source, entry], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    console.error(
      "No se pudo leer el Excel. Comprueba que unzip está instalado y que el archivo no está bloqueado.",
    );
    process.exit(1);
  }
}

function decodeXml(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function sharedStrings() {
  return [
    ...readZipEntry("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g),
  ].map((match) =>
    [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
      .map((textMatch) => decodeXml(textMatch[1]))
      .join(""),
  );
}

function readRows() {
  const strings = sharedStrings();
  const xml = readZipEntry("xl/worksheets/sheet1.xml");
  const rows = [];
  for (const rowMatch of xml.matchAll(
    /<row\b[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g,
  )) {
    const cells = {};
    for (const cellMatch of rowMatch[2].matchAll(
      /<c\b([^>]*)>([\s\S]*?)<\/c>/g,
    )) {
      const attributes = cellMatch[1];
      const body = cellMatch[2];
      const reference = /\br="([A-Z]+\d+)"/.exec(attributes)?.[1];
      if (!reference) continue;
      const column = /^[A-Z]+/.exec(reference)[0];
      const type = /\bt="([^"]+)"/.exec(attributes)?.[1];
      const value = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "";
      cells[column] = type === "s" ? strings[Number(value)] : value;
    }
    rows.push(cells);
  }
  return rows;
}

const columns = ["Plato", "Tipo 1", "Tipo 2", "Tipo 3", "Temporada", "Receta"];
const rows = readRows();
const data = rows
  .slice(1)
  .map((row) =>
    Object.fromEntries(
      columns.map((column, index) => [
        String.fromCharCode(65 + index),
        row[String.fromCharCode(65 + index)] ?? "",
      ]),
    ),
  )
  .filter((row) => row.A.trim());

const normalize = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es");
const categories = new Map();
const invalidType3 = [];
for (const row of data) {
  for (const column of ["B", "C", "D"]) {
    const value = row[column].trim();
    if (value && column !== "D") categories.set(normalize(value), value);
    if (column === "D" && value && !/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(value)) {
      invalidType3.push({ dish: row.A, value });
    } else if (column === "D" && value) {
      categories.set(normalize(value), value);
    }
  }
}

const report = {
  source,
  sheet: "Hoja 1",
  rows: data.length,
  uniqueDishes: new Set(data.map((row) => normalize(row.A))).size,
  categories: [...categories.values()].sort((left, right) =>
    left.localeCompare(right, "es"),
  ),
  missingPrimaryType: data.filter((row) => !row.B.trim()).map((row) => row.A),
  invalidType3,
  recipes: data
    .filter((row) => row.F.trim())
    .map((row) => ({ dish: row.A, url: row.F })),
  dishes: data.map((row) => ({
    name: row.A.trim(),
    categories: [row.B, row.C, row.D]
      .map((value) => value.trim())
      .filter(Boolean),
    season: row.E.trim() || null,
    recipe: row.F.trim() || null,
  })),
};

if (jsonOutput) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`Excel: ${report.source}`);
  console.log(`Platos: ${report.rows} (${report.uniqueDishes} nombres únicos)`);
  console.log(`Categorías detectadas: ${report.categories.length}`);
  console.log(`Sin Tipo 1: ${report.missingPrimaryType.length}`);
  console.log(`Incidencias en Tipo 3: ${report.invalidType3.length}`);
  console.log(`Recetas enlazadas: ${report.recipes.length}`);
}
