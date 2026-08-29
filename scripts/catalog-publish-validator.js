"use strict";

const BLOCKED_MARKERS = /\b(sample|development|fixture|test|demo|unverified)\b/i;
const APPROVED_IMAGE_PERMISSION = /(authorized|licensed|permission-granted|owned-asset|public-domain|affiliate-feed|manufacturer-feed|retailer-feed)/i;
const normalize = value => value === null || value === undefined ? "" : String(value).trim();
const httpUrl = value => {
  if (!normalize(value)) return true;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
};
const numericPrice = value => value === null || value === undefined || value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0);
function containsPrivateCustomerData(value) {
  if (Array.isArray(value)) return value.some(containsPrivateCustomerData);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, item]) => /^(email|customerEmail|customer_email|password)$/i.test(key) || containsPrivateCustomerData(item));
}

function validateApproval(metadata) {
  const errors = [];
  if (metadata.environment !== "production") errors.push("Feed environment must be exactly 'production'.");
  if (metadata.approvalStatus !== "approved") errors.push("Feed approvalStatus must be exactly 'approved'.");
  if (metadata.publicationAuthorized !== true) errors.push("Feed publicationAuthorized must be true.");
  if (!normalize(metadata.sourceId)) errors.push("An approved production sourceId is required.");
  if (!normalize(metadata.approvedAt)) errors.push("An approval timestamp is required.");
  if (!Array.isArray(metadata.approvedRetailerIds) || !metadata.approvedRetailerIds.length) errors.push("approvedRetailerIds must list the retailers authorized for this source.");
  if (BLOCKED_MARKERS.test(JSON.stringify(metadata))) errors.push("Feed metadata contains a blocked sample/development/test marker.");
  return errors;
}

function hasIdentity(product) {
  const identity = product.identity || {};
  const retailerIds = product.retailerIdentifiers || {};
  return Boolean(normalize(identity.upc) || normalize(identity.gtin) || (normalize(identity.manufacturer) && normalize(identity.modelNumber)) || normalize(identity.mpn) || Object.keys(retailerIds).length || (normalize(identity.brand || product.brand) && normalize(identity.modelNumber || product.modelNumber)));
}

function validateProduct(product, metadata, index, enforceSourceAuthorization = false) {
  const errors = [], prefix = `Product ${product.id || index + 1}`;
  if (containsPrivateCustomerData(product)) errors.push(`${prefix}: customer or credential fields cannot enter the public catalog.`);
  if (!normalize(product.id) || !normalize(product.name) || !hasIdentity(product)) errors.push(`${prefix}: required product identity is incomplete.`);
  if (BLOCKED_MARKERS.test(product.dataStatus || "") || product.dataStatus !== "production-approved") errors.push(`${prefix}: dataStatus must be 'production-approved'.`);
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const variantIds = variants.map(variant => normalize(variant.variantId)).filter(Boolean);
  if (variants.some(variant => !normalize(variant.variantId))) errors.push(`${prefix}: every variant requires a variantId.`);
  if (new Set(variantIds).size !== variantIds.length) errors.push(`${prefix}: duplicate variant IDs detected.`);
  if (variants.length && variants.filter(variant => variant.isDefaultVariant === true).length !== 1) errors.push(`${prefix}: variants require exactly one default variant.`);
  const media = product.media || {};
  const imageUrls = [media.primaryImage, media.thumbnail, ...(Array.isArray(media.galleryImages) ? media.galleryImages : [])].filter(value => normalize(value));
  if (imageUrls.length) {
    if (imageUrls.some(value => !httpUrl(value))) errors.push(`${prefix}: image URLs must use HTTP or HTTPS.`);
    if (!APPROVED_IMAGE_PERMISSION.test(media.imageLicenseOrPermission || "") || !normalize(media.imageSource)) errors.push(`${prefix}: image URL lacks authorized permission/source metadata.`);
  }
  (product.offers || []).forEach((offer, offerIndex) => {
    const offerPrefix = `${prefix}, offer ${offer.offerId || offerIndex + 1}`;
    if (!normalize(offer.retailerId) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(offer.retailerId || "") || !normalize(offer.retailerName)) errors.push(`${offerPrefix}: valid retailer identity is required.`);
    if (enforceSourceAuthorization && Array.isArray(metadata.approvedRetailerIds) && !metadata.approvedRetailerIds.includes(offer.retailerId)) errors.push(`${offerPrefix}: retailer is not approved for this source.`);
    if (!httpUrl(offer.productUrl) || !httpUrl(offer.affiliateUrl)) errors.push(`${offerPrefix}: retailer URLs must use HTTP or HTTPS.`);
    if (!numericPrice(offer.price) || !numericPrice(offer.salePrice) || !numericPrice(offer.regularPrice)) errors.push(`${offerPrefix}: prices must be valid non-negative numbers.`);
    if ((offer.price !== null || offer.salePrice !== null) && !/^[A-Z]{3}$/.test(offer.currency || "")) errors.push(`${offerPrefix}: a three-letter currency is required with prices.`);
    if (offer.variantId && variants.length && !variantIds.includes(offer.variantId)) errors.push(`${offerPrefix}: offer references an unknown variant.`);
    if (normalize(offer.affiliateUrl)) {
      if (!normalize(offer.affiliateProgram) || offer.affiliateTrackingStatus !== "approved-production") errors.push(`${offerPrefix}: affiliate URL lacks approved program/tracking metadata.`);
      if (enforceSourceAuthorization && metadata.affiliateAuthorization !== true) errors.push(`${offerPrefix}: this source is not authorized to publish affiliate URLs.`);
      if (/(example|sample|fixture|test|demo|your[_-]?(id|tag)|placeholder)/i.test(offer.affiliateUrl)) errors.push(`${offerPrefix}: affiliate URL contains a blocked placeholder marker.`);
    }
  });
  return errors;
}

function validatePublish({ metadata, products, incomingProducts = [], report }) {
  const errors = validateApproval(metadata);
  if (report.conflicts > 0) errors.push("Unresolved identity or variant conflicts block publishing.");
  if (report.skipped > 0) errors.push("Review-required or skipped records block publishing.");
  if (report.errors > 0) errors.push("Updater errors block publishing.");
  products.forEach((product, index) => errors.push(...validateProduct(product, metadata, index)));
  incomingProducts.forEach((product, index) => errors.push(...validateProduct(product, metadata, index, true)));
  return { valid:errors.length === 0, errors };
}

module.exports = { containsPrivateCustomerData, validateApproval, validateProduct, validatePublish };
