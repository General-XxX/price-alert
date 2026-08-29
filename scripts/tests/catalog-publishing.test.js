"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { validatePublish } = require("../catalog-publish-validator.js");
const { publishAtomically } = require("../catalog-publisher.js");

const approvedMetadata = {
  environment:"production", approvalStatus:"approved", publicationAuthorized:true,
  sourceId:"approved-feed-source", approvedAt:"2026-08-29T00:00:00.000Z",
  approvedRetailerIds:["approved-retailer"], affiliateAuthorization:false
};
const product = {
  id:"approved-product", name:"Approved Product", brand:"Known Brand", modelNumber:"MODEL-1",
  identity:{ brand:"Known Brand", manufacturer:"Known Brand", modelNumber:"MODEL-1", mpn:"MODEL-1", upc:"", gtin:"" },
  variants:[{ variantId:"approved-product-default", isDefaultVariant:true }],
  offers:[{ offerId:"approved-offer", retailerId:"approved-retailer", retailerName:"Approved Retailer", variantId:"approved-product-default", price:10, regularPrice:12, currency:"USD", productUrl:"https://retailer.invalid/product", affiliateUrl:"" }],
  media:{ primaryImage:"", imageSource:"", imageLicenseOrPermission:"" }, dataStatus:"production-approved"
};
const cleanReport = { conflicts:0, skipped:0, errors:0 };

assert.equal(validatePublish({ metadata:approvedMetadata, products:[product], incomingProducts:[product], report:cleanReport }).valid, true);
assert.equal(validatePublish({ metadata:{ ...approvedMetadata, environment:"development" }, products:[product], incomingProducts:[product], report:cleanReport }).valid, false);
assert.equal(validatePublish({ metadata:approvedMetadata, products:[{ ...product, dataStatus:"sample-development" }], incomingProducts:[], report:cleanReport }).valid, false);
assert.equal(validatePublish({ metadata:approvedMetadata, products:[{ ...product, offers:[{ ...product.offers[0], productUrl:"javascript:alert(1)" }] }], incomingProducts:[], report:cleanReport }).valid, false);
assert.equal(validatePublish({ metadata:approvedMetadata, products:[{ ...product, media:{ primaryImage:"https://images.invalid/p.jpg", imageSource:"", imageLicenseOrPermission:"unknown" } }], incomingProducts:[], report:cleanReport }).valid, false);

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "price-alert-publish-test-"));
const outputPath = path.join(temporaryRoot, "data", "catalog.generated.json");
try {
  const first = publishAtomically({ outputPath, products:[product], report:{ runAt:"2026-08-29T00:00:00.000Z", sourceId:"approved-feed-source" } });
  assert.equal(first.backupPath, null);
  const second = publishAtomically({ outputPath, products:[{ ...product, description:"Factual update" }], report:{ runAt:"2026-08-29T01:00:00.000Z", sourceId:"approved-feed-source" } });
  assert.equal(fs.existsSync(second.backupPath), true);
  assert.equal(JSON.parse(fs.readFileSync(outputPath, "utf8")).products[0].description, "Factual update");
} finally {
  const resolved = path.resolve(temporaryRoot);
  assert.equal(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep), true);
  fs.rmSync(resolved, { recursive:true, force:true });
}

console.log("Catalog publishing validation and rollback tests passed.");
