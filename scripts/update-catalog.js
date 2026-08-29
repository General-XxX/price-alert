#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const importer = require(path.resolve(__dirname, "..", "catalog-importer.js"));
const { updateCatalog } = require(path.resolve(__dirname, "catalog-update-core.js"));
const jsonAdapter = require(path.resolve(__dirname, "adapters", "json-file-adapter.js"));

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const projectRoot = path.resolve(__dirname, "..");
const feedPath = path.resolve(projectRoot, argument("--feed", "fixtures/daily-update-feed.json"));
const reportPath = path.resolve(projectRoot, argument("--report", "artifacts/daily-update-report.json"));
const snapshotPath = path.resolve(projectRoot, argument("--snapshot", "artifacts/catalog-update-preview.json"));
const writeRequested = process.argv.includes("--write");

global.window = { PriceAlertImporter:importer };
require(path.resolve(projectRoot, "products.js"));
const existingProducts = global.window.PriceAlertData.products;
const loaded = jsonAdapter.load({ source:feedPath, importer });
const initialReport = { added:0, updated:0, unchanged:0, skipped:0, conflicts:0, errors:loaded.errors.length, details:loaded.errors.map(message => ({ action:"import-error", message })) };
const firstPass = loaded.errors.length ? { products:existingProducts, report:initialReport } : updateCatalog(existingProducts, loaded.products);
const secondPass = updateCatalog(firstPass.products, loaded.products);
const idempotent = secondPass.report.added === 0 && secondPass.report.updated === 0 && secondPass.report.errors === 0;
const sampleFeed = loaded.products.some(product => /sample|development|fixture/i.test(product.dataStatus || "") || /sample|development|fixture/i.test(JSON.stringify(product.sourceMetadata || {})));

const report = {
  runAt:new Date().toISOString(), mode:writeRequested ? "write-requested" : "dry-run", adapter:loaded.adapter,
  source:path.relative(projectRoot, loaded.source).replace(/\\/g, "/"), sampleFeed, publishBlocked:sampleFeed,
  idempotent, counts:firstPass.report, secondPassCounts:secondPass.report,
  catalogBefore:existingProducts.length, catalogAfter:firstPass.products.length
};

fs.mkdirSync(path.dirname(reportPath), { recursive:true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
fs.writeFileSync(snapshotPath, `${JSON.stringify({ generatedAt:report.runAt, dataStatus:sampleFeed ? "sample-development-preview" : "pending-review", products:firstPass.products }, null, 2)}\n`, "utf8");

if (writeRequested) {
  console.error(sampleFeed ? "Publishing blocked: sample/development feeds cannot update the public catalog." : "Publishing is not enabled. Add an approved persistence and review stage first.");
  process.exitCode = 2;
}
if (!idempotent) process.exitCode = 1;
console.log(JSON.stringify(report, null, 2));
