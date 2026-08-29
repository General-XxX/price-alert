"use strict";

const VARIANT_FIELDS = ["toolOnly", "storage", "screenSize", "memory", "packageQuantity", "bundleContents", "configuration", "capacity", "size", "platform", "edition"];
const present = value => value !== null && value !== undefined && value !== "" && (!Array.isArray(value) || value.length > 0);
const normalizeIdentifier = value => present(value) ? String(value).normalize("NFKC").trim().toUpperCase().replace(/[\s\-_.\/]+/g, "") : "";
const normalizeText = value => present(value) ? String(value).normalize("NFKC").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() : "";
const normalizeVariant = value => Array.isArray(value) ? value.map(normalizeVariant).sort().join("|") : typeof value === "boolean" ? String(value) : normalizeIdentifier(value);

function identityValue(product, key) {
  if (product.identity && present(product.identity[key])) return product.identity[key];
  if (present(product[key])) return product[key];
  return product.specifications && product.specifications[key];
}

function defaultVariant(product) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  return variants.find(variant => variant.isDefaultVariant) || variants[0] || null;
}

function variantValue(product, key) {
  const variant = defaultVariant(product);
  if (variant && present(variant[key])) return variant[key];
  if (product.specifications && present(product.specifications[key])) return product.specifications[key];
  return product.identity && product.identity[key];
}

function compareVariantCompatibility(first, second) {
  const conflicts = VARIANT_FIELDS.filter(field => {
    const firstValue = normalizeVariant(variantValue(first, field));
    const secondValue = normalizeVariant(variantValue(second, field));
    return firstValue && secondValue && firstValue !== secondValue;
  });
  return { compatible:conflicts.length === 0, conflicts, reviewRequired:conflicts.length > 0 };
}

function retailerIdentifierMatch(first, second) {
  const left = first.retailerIdentifiers || {}, right = second.retailerIdentifiers || {};
  return Object.keys(left).some(retailer => Object.keys(left[retailer] || {}).some(field => {
    const firstValue = normalizeIdentifier(left[retailer][field]);
    const secondValue = normalizeIdentifier((right[retailer] || {})[field]);
    return firstValue && secondValue && firstValue === secondValue;
  }));
}

function nameSimilarity(first, second) {
  const left = new Set(normalizeText(first).split(" ").filter(token => token.length > 1));
  const right = new Set(normalizeText(second).split(" ").filter(token => token.length > 1));
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter(token => right.has(token)).length;
  return intersection / new Set([...left, ...right]).size;
}

function matchProducts(existing, incoming) {
  const compatibility = compareVariantCompatibility(existing, incoming);
  const result = matchedBy => compatibility.compatible
    ? { isMatch:true, confidence:"high", matchedBy, reviewRequired:false, compatibility }
    : { isMatch:false, confidence:"low", matchedBy, reviewRequired:true, compatibility };
  const existingUpc = normalizeIdentifier(identityValue(existing, "upc")), incomingUpc = normalizeIdentifier(identityValue(incoming, "upc"));
  const existingGtin = normalizeIdentifier(identityValue(existing, "gtin")), incomingGtin = normalizeIdentifier(identityValue(incoming, "gtin"));
  if ((existingUpc && existingUpc === incomingUpc) || (existingGtin && existingGtin === incomingGtin) || (existingUpc && existingUpc === incomingGtin) || (existingGtin && existingGtin === incomingUpc)) return result(existingUpc === incomingUpc ? "upc" : "gtin");
  const manufacturer = normalizeText(identityValue(existing, "manufacturer")), incomingManufacturer = normalizeText(identityValue(incoming, "manufacturer"));
  const model = normalizeIdentifier(identityValue(existing, "modelNumber")), incomingModel = normalizeIdentifier(identityValue(incoming, "modelNumber"));
  if (manufacturer && manufacturer === incomingManufacturer && model && model === incomingModel) return result("manufacturer-model");
  const mpn = normalizeIdentifier(identityValue(existing, "mpn")), incomingMpn = normalizeIdentifier(identityValue(incoming, "mpn"));
  if (mpn && mpn === incomingMpn) return result("mpn");
  if (retailerIdentifierMatch(existing, incoming)) return result("retailer-id");
  const brand = normalizeText(identityValue(existing, "brand")), incomingBrand = normalizeText(identityValue(incoming, "brand"));
  if (brand && brand === incomingBrand && model && model === incomingModel) return { ...result("brand-model"), confidence:compatibility.compatible ? "medium" : "low", reviewRequired:!compatibility.compatible };
  if (nameSimilarity(existing.name, incoming.name) >= .6) return { isMatch:false, confidence:"low", matchedBy:"name-fallback", reviewRequired:true, compatibility };
  return { isMatch:false, confidence:"low", matchedBy:null, reviewRequired:false, compatibility };
}

function mergeKnown(existing, incoming) {
  if (!present(incoming)) return existing;
  if (Array.isArray(incoming)) return incoming.length ? incoming : existing;
  if (typeof incoming !== "object") return incoming;
  const output = { ...(existing && typeof existing === "object" ? existing : {}) };
  Object.entries(incoming).forEach(([key, value]) => { output[key] = mergeKnown(output[key], value); });
  return output;
}

function offerKey(offer) {
  return offer.offerId || [offer.retailerId, offer.variantId, offer.retailerProductId || offer.retailerSku || offer.retailerModelNumber].filter(Boolean).join("|") || null;
}

function mergeOffers(existingOffers, incomingOffers) {
  const output = (existingOffers || []).map(offer => ({ ...offer }));
  (incomingOffers || []).forEach(incoming => {
    const key = offerKey(incoming);
    const index = key ? output.findIndex(offer => offerKey(offer) === key) : -1;
    if (index >= 0) output[index] = mergeKnown(output[index], incoming); else output.push(incoming);
  });
  return output;
}

function countOfferChanges(existingOffers, incomingOffers) {
  return (incomingOffers || []).reduce((count, incoming) => {
    const key = offerKey(incoming);
    const existing = key ? (existingOffers || []).find(offer => offerKey(offer) === key) : null;
    return count + (!existing || JSON.stringify(mergeKnown(existing, incoming)) !== JSON.stringify(existing) ? 1 : 0);
  }, 0);
}

function mergeHistory(existingHistory, incomingHistory) {
  const output = [...(existingHistory || [])];
  (incomingHistory || []).forEach(entry => {
    const duplicate = output.some(item => item.recordedAt === entry.recordedAt && item.price === entry.price && item.currency === entry.currency);
    if (!duplicate) output.push(entry);
  });
  return output;
}

function mergeProduct(existing, incoming) {
  const merged = mergeKnown(existing, incoming);
  merged.id = existing.id;
  merged.familyId = existing.familyId;
  merged.offers = mergeOffers(existing.offers, incoming.offers);
  merged.priceHistory = mergeHistory(existing.priceHistory, incoming.priceHistory);
  return merged;
}

function updateCatalog(existingProducts, incomingProducts) {
  const products = existingProducts.map(product => structuredClone(product));
  const report = { added:0, updated:0, unchanged:0, skipped:0, conflicts:0, errors:0, offersUpdated:0, details:[] };
  incomingProducts.forEach(incoming => {
    try {
      const candidates = products.map((product, index) => ({ product, index, match:matchProducts(product, incoming) }));
      const conflict = candidates.find(candidate => candidate.match.matchedBy && !candidate.match.isMatch && candidate.match.compatibility && !candidate.match.compatibility.compatible);
      if (conflict) { report.conflicts += 1; report.skipped += 1; report.details.push({ action:"conflict", incomingId:incoming.id, existingId:conflict.product.id, matchedBy:conflict.match.matchedBy, conflicts:conflict.match.compatibility.conflicts }); return; }
      const matched = candidates.find(candidate => candidate.match.isMatch);
      if (!matched) {
        const weak = candidates.find(candidate => candidate.match.matchedBy === "name-fallback");
        if (weak) { report.skipped += 1; report.details.push({ action:"review-required", incomingId:incoming.id, existingId:weak.product.id, matchedBy:"name-fallback" }); return; }
        products.push(incoming); report.added += 1; report.offersUpdated += (incoming.offers || []).length; report.details.push({ action:"added", productId:incoming.id }); return;
      }
      const offerChanges = countOfferChanges(matched.product.offers, incoming.offers);
      const merged = mergeProduct(matched.product, incoming);
      if (JSON.stringify(merged) === JSON.stringify(matched.product)) { report.unchanged += 1; report.details.push({ action:"unchanged", productId:matched.product.id, matchedBy:matched.match.matchedBy }); }
      else { products[matched.index] = merged; report.updated += 1; report.offersUpdated += offerChanges; report.details.push({ action:"updated", productId:matched.product.id, matchedBy:matched.match.matchedBy }); }
    } catch (error) { report.errors += 1; report.details.push({ action:"error", incomingId:incoming && incoming.id, message:error.message }); }
  });
  return { products, report };
}

module.exports = { normalizeIdentifier, compareVariantCompatibility, matchProducts, mergeKnown, mergeOffers, countOfferChanges, mergeProduct, updateCatalog };
