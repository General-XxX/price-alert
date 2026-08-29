#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const importer = require(path.resolve(__dirname, "..", "catalog-importer.js"));
const { updateCatalog } = require(path.resolve(__dirname, "catalog-update-core.js"));
const { validatePublish } = require(path.resolve(__dirname, "catalog-publish-validator.js"));
const { publishAtomically } = require(path.resolve(__dirname, "catalog-publisher.js"));
const adapterRegistry = require(path.resolve(__dirname, "adapters", "adapter-registry.js"));

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive:true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const projectRoot = path.resolve(__dirname, "..");
const requestedMode = process.argv.includes("--write") ? "publish" : argument("--mode", "preview");
if (!new Set(["preview", "dry-run", "publish"]).has(requestedMode)) {
  console.error("Invalid --mode. Use preview, dry-run, or publish.");
  process.exit(2);
}
const mode = requestedMode === "dry-run" ? "preview" : requestedMode;
const feedPath = path.resolve(projectRoot, argument("--feed", "fixtures/daily-update-feed.json"));
const adapterId = argument("--adapter", "generic-file");
const defaultReport = mode === "publish" ? "artifacts/catalog-publish-report.json" : "artifacts/daily-update-report.json";
const reportPath = path.resolve(projectRoot, argument("--report", defaultReport));
const snapshotPath = path.resolve(projectRoot, argument("--snapshot", "artifacts/catalog-update-preview.json"));
const outputPath = path.resolve(projectRoot, argument("--output", "data/catalog.generated.json"));

global.window = { PriceAlertImporter:importer };
require(path.resolve(projectRoot, "products.js"));
const sourceProducts = global.window.PriceAlertData.products;
let existingProducts = sourceProducts;
let catalogBase = "products.js";
if (mode === "publish") {
  if (fs.existsSync(outputPath)) {
    const generated = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    if (!Array.isArray(generated.products)) throw new Error("Existing generated catalog is invalid; refusing to publish over it.");
    existingProducts = generated.products;
    catalogBase = path.relative(projectRoot, outputPath).replace(/\\/g, "/");
  } else {
    // Sample records in products.js are never used to bootstrap a production catalog.
    existingProducts = [];
    catalogBase = "empty-production-catalog";
  }
}
const selectedAdapter = adapterRegistry.get(adapterId);
if (typeof selectedAdapter.load !== "function") throw new Error(`${selectedAdapter.displayName} is a credential-gated stub; connect an approved server-side fetch implementation before use.`);
const loaded = selectedAdapter.load({ source:feedPath, importer });
const initialReport = {
  added:0, updated:0, unchanged:0, skipped:0, conflicts:0,
  errors:loaded.errors.length, offersUpdated:0,
  details:loaded.errors.map(message => ({ action:"import-error", message }))
};
const firstPass = loaded.errors.length ? { products:existingProducts, report:initialReport } : updateCatalog(existingProducts, loaded.products);
const secondPass = loaded.errors.length ? { report:initialReport } : updateCatalog(firstPass.products, loaded.products);
const idempotent = secondPass.report.added === 0 && secondPass.report.updated === 0 && secondPass.report.errors === 0;
const blockedMarker = /sample|development|fixture|test|demo|unverified/i;
const sampleFeed = blockedMarker.test(JSON.stringify(loaded.metadata || {})) || loaded.products.some(product =>
  blockedMarker.test(product.dataStatus || "") || blockedMarker.test(JSON.stringify(product.sourceMetadata || {}))
);

const report = {
  runAt:new Date().toISOString(), mode, adapter:loaded.adapter,
  source:path.relative(projectRoot, loaded.source).replace(/\\/g, "/"),
  sourceId:loaded.metadata?.sourceId || null, sampleFeed, publishBlocked:mode === "publish", idempotent, catalogBase,
  counts:{
    added:firstPass.report.added, updated:firstPass.report.updated, unchanged:firstPass.report.unchanged,
    skipped:firstPass.report.skipped, conflicts:firstPass.report.conflicts, errors:firstPass.report.errors,
    productsPublished:0, offersUpdated:firstPass.report.offersUpdated || 0
  },
  details:firstPass.report.details, secondPassCounts:secondPass.report,
  catalogBefore:existingProducts.length, catalogAfter:firstPass.products.length,
  generatedCatalog:path.relative(projectRoot, outputPath).replace(/\\/g, "/"),
  validationErrors:[], backupPath:null
};

if (mode === "preview") {
  report.publishBlocked = true;
  writeJson(snapshotPath, {
    generatedAt:report.runAt, mode:"preview-only",
    dataStatus:sampleFeed ? "sample-development-preview" : "pending-production-validation",
    products:firstPass.products
  });
} else {
  const validation = validatePublish({
    metadata:loaded.metadata || {}, products:firstPass.products,
    incomingProducts:loaded.products, report:firstPass.report
  });
  report.validationErrors = validation.errors;
  report.publishBlocked = !validation.valid;
  if (validation.valid) {
    try {
      const published = publishAtomically({ outputPath, products:firstPass.products, report });
      report.publishBlocked = false;
      report.counts.productsPublished = firstPass.products.length;
      report.backupPath = published.backupPath ? path.relative(projectRoot, published.backupPath).replace(/\\/g, "/") : null;
    } catch (error) {
      report.publishBlocked = true;
      report.counts.errors += 1;
      report.validationErrors.push(`Atomic publish failed: ${error.message}`);
    }
  }
}

writeJson(reportPath, report);
console.log(JSON.stringify(report, null, 2));
if (mode === "publish" && report.publishBlocked) {
  console.error("Production publishing blocked. No generated live catalog was replaced.");
  process.exitCode = 2;
} else if (!idempotent || report.counts.errors > 0) {
  process.exitCode = 1;
}
