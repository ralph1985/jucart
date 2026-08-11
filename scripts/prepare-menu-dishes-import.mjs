#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";

const excelPath = process.argv[process.argv.indexOf("--excel-json") + 1];
const existingPath = process.argv[process.argv.indexOf("--existing-json") + 1];
const jsonOutput = process.argv.includes("--json");

if (
  !excelPath ||
  !existsSync(excelPath) ||
  !existingPath ||
  !existsSync(existingPath)
) {
  console.error(
    "Debes indicar --excel-json con la salida del analizador y --existing-json con la exportación de platos actuales.",
  );
  process.exit(1);
}

const excelReport = JSON.parse(readFileSync(excelPath, "utf8"));
const existingReport = JSON.parse(readFileSync(existingPath, "utf8"));
const existing = existingReport.rows ?? existingReport;

const normalize = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9ñ ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
const tokens = (value) =>
  new Set(
    normalize(value)
      .split(" ")
      .filter((token) => token.length > 3),
  );
const similarity = (left, right) => {
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  const intersection = [...leftTokens].filter((token) =>
    rightTokens.has(token),
  ).length;
  return (
    intersection / Math.max(1, Math.min(leftTokens.size, rightTokens.size))
  );
};
const nameCorrections = new Map([
  ["Humus", "Hummus"],
  ["Brocoli con tomate y huevo", "Brócoli con tomate y huevo"],
  [
    "Judias verdes con patata y zanahoria",
    "Judías verdes con patata y zanahoria",
  ],
  ["Romanescu", "Romanesco"],
  ["Hervido con acelgas, etc..", "Hervido con acelgas, etc."],
]);
const validCategories = new Set(excelReport.categories.map(normalize));
const proposals = excelReport.dishes.map((dish) => {
  const matches = existing
    .map((current) => ({
      name: current.name,
      score: similarity(dish.name, current.name),
    }))
    .filter((match) => match.score >= 0.5)
    .sort((left, right) => right.score - left.score);
  const categories = dish.categories
    .filter((category) => validCategories.has(normalize(category)))
    .filter((category) => !/^\d+$/.test(category));
  return {
    sourceName: dish.name,
    proposedName: nameCorrections.get(dish.name) ?? dish.name,
    categories,
    functionalType: null,
    exactMatch:
      existing.find(
        (current) => normalize(current.name) === normalize(dish.name),
      )?.name ?? null,
    possibleMatches: matches,
    needsReview: Boolean(
      matches.length ||
      dish.categories.some((category) => /^\d+$/.test(category)),
    ),
  };
});

const report = {
  source: excelReport.source,
  existingCount: existing.length,
  excelCount: proposals.length,
  exactMatches: proposals.filter((proposal) => proposal.exactMatch).length,
  possibleMatches: proposals.filter(
    (proposal) => proposal.possibleMatches.length,
  ).length,
  pendingReview: proposals.filter((proposal) => proposal.needsReview).length,
  proposals,
};

if (jsonOutput) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`Platos actuales: ${report.existingCount}`);
  console.log(`Platos del Excel: ${report.excelCount}`);
  console.log(`Coincidencias exactas: ${report.exactMatches}`);
  console.log(`Coincidencias para revisar: ${report.possibleMatches}`);
  console.log(`Propuestas pendientes: ${report.pendingReview}`);
  for (const proposal of proposals.filter((item) => item.needsReview)) {
    console.log(
      `- ${proposal.sourceName}: ${proposal.possibleMatches.map((match) => match.name).join(", ")}`,
    );
  }
}
