// Interface logic consumes either the approved generated catalog or products.js fallback.
window.PriceAlertCatalogReady.then(catalog => {
const alertStorage = window.PriceAlertStorage;

if (!catalog || !Array.isArray(catalog.products) || !Array.isArray(catalog.categories) || !alertStorage) {
  throw new Error("Price Alert product data failed to load.");
}

const products = catalog.products;
const categories = catalog.categories;
const retailerRecords = catalog.retailers || [];
const retailers = retailerRecords.length && typeof retailerRecords[0] === "object"
  ? retailerRecords.map(retailer => retailer.displayName || retailer.name)
  : retailerRecords;
const state = { query:"", category:"", retailer:"", min:"", max:"", availability:"", sort:"low", saved:loadSaved() };
const $ = (selector) => document.querySelector(selector);
const money = (value, currency = "USD") => new Intl.NumberFormat("en-US", { style:"currency", currency }).format(value);

function validOfferPrice(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function currentOfferPrice(offer) {
  const salePrice = validOfferPrice(offer && offer.salePrice);
  return salePrice !== null ? salePrice : validOfferPrice(offer && offer.price);
}

function regularAndSalePrice(offer) {
  const currentPrice = currentOfferPrice(offer);
  const regularPrice = validOfferPrice(offer && offer.regularPrice);
  const onSale = currentPrice !== null && regularPrice !== null && regularPrice > currentPrice;
  return { currentPrice, regularPrice, salePrice:onSale ? currentPrice : null, onSale };
}

function calculateOfferSavingsAmount(offer) {
  const prices = regularAndSalePrice(offer);
  return prices.onSale ? Number((prices.regularPrice - prices.currentPrice).toFixed(2)) : 0;
}

function calculateOfferSavingsPercent(offer) {
  const prices = regularAndSalePrice(offer);
  return prices.onSale && prices.regularPrice > 0 ? Number(((prices.regularPrice - prices.currentPrice) / prices.regularPrice * 100).toFixed(2)) : 0;
}

function isOfferCompatibleWithProduct(offer, product) {
  if (!offer || !product) return false;
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (offer.variantId && variants.length && !variants.some(variant => variant.variantId === offer.variantId)) return false;
  if (offer.retailerModelNumber) {
    const offerModel = normalizeModelIdentifier(offer.retailerModelNumber);
    const validModels = [product.modelNumber, ...variants.map(variant => variant.modelNumber)].map(normalizeModelIdentifier).filter(Boolean);
    if (offerModel && validModels.length && !validModels.includes(offerModel)) return false;
  }
  return true;
}

function isOfferCurrentlyAvailable(offer, product = null) {
  if (!offer || currentOfferPrice(offer) === null || !offer.currency) return false;
  if (product && !isOfferCompatibleWithProduct(offer, product)) return false;
  if (["inactive", "invalid", "removed"].includes(String(offer.offerStatus || "").toLowerCase())) return false;
  if (String(offer.stockStatus || "").toLowerCase() === "out-of-stock") return false;
  return !/out of stock|unavailable/i.test(offer.availability || "");
}

function sortOffersByLowestPrice(offers, { product = null, currency = null } = {}) {
  const available = (Array.isArray(offers) ? offers : []).filter(offer => isOfferCurrentlyAvailable(offer, product));
  const comparisonCurrency = currency || (available[0] && available[0].currency) || null;
  return available.filter(offer => offer.currency === comparisonCurrency).map((offer, index) => ({ offer, index })).sort((a, b) => currentOfferPrice(a.offer) - currentOfferPrice(b.offer) || a.index - b.index).map(item => item.offer);
}

function bestAvailableOffer(product, currency = null) {
  return sortOffersByLowestPrice(product && product.offers, { product, currency })[0] || null;
}

const lowestOffer = product => bestAvailableOffer(product);
const lowest = product => {
  const offer = lowestOffer(product);
  return offer ? currentOfferPrice(offer) : null;
};
const discountAmount = (product) => {
  const bestOffer = lowestOffer(product);
  return bestOffer ? calculateOfferSavingsAmount(bestOffer) : 0;
};
const productDetailPath = product => product && product.slug ? `products/index.html?slug=${encodeURIComponent(product.slug)}` : null;
const productTitleMarkup = product => {
  const path = productDetailPath(product);
  return path ? `<a class="product-title-link" href="${path}">${escapeHtml(product.name)}</a>` : escapeHtml(product.name);
};
const linkedProductMedia = (product, options) => {
  const path = productDetailPath(product);
  const media = renderProductMedia(product, options);
  return path ? `<a class="product-media-link" href="${path}" aria-label="View ${escapeHtml(product.brand)} ${escapeHtml(product.name)} details">${media}</a>` : media;
};
if (!window.PriceAlertRetailerLinks) throw new Error("Price Alert retailer link helpers failed to load.");
const { validExternalUrl, retailerSearchUrl, resolveOfferDestination, retailerSearchUrls:RETAILER_SEARCH_URLS } = window.PriceAlertRetailerLinks;
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);

// Product identity helpers are intentionally independent of the current UI so
// future retailer-feed importers can reuse the same comparison contract.
function identityValue(product, key) {
  if (product.identity && Object.prototype.hasOwnProperty.call(product.identity, key)) return product.identity[key];
  if (key === "brand") return product.brand;
  if (key === "modelNumber") return product.modelNumber;
  if (key === "upc") return product.specifications && product.specifications.upc;
  return null;
}

function normalizeTradeIdentifier(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim().toUpperCase().replace(/[\s-]+/g, "");
}

function normalizeModelIdentifier(value) {
  if (value === null || value === undefined) return "";
  return String(value).normalize("NFKC").trim().toUpperCase().replace(/[\s\-_.\/]+/g, "");
}

function normalizeIdentityText(value) {
  if (value === null || value === undefined) return "";
  return String(value).normalize("NFKC").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function exactIdentityMatch(first, second, key, normalizer = normalizeModelIdentifier) {
  const firstValue = normalizer(identityValue(first, key));
  const secondValue = normalizer(identityValue(second, key));
  return Boolean(firstValue && secondValue && firstValue === secondValue);
}

function hasRetailerIdentifierMatch(first, second) {
  const firstIdentifiers = first.retailerIdentifiers || {};
  const secondIdentifiers = second.retailerIdentifiers || {};

  return Object.keys(firstIdentifiers).some(retailer => {
    const firstRetailer = firstIdentifiers[retailer] || {};
    const secondRetailer = secondIdentifiers[retailer] || {};
    return Object.keys(firstRetailer).some(field => {
      const firstValue = normalizeModelIdentifier(firstRetailer[field]);
      const secondValue = normalizeModelIdentifier(secondRetailer[field]);
      return Boolean(firstValue && secondValue && firstValue === secondValue);
    });
  });
}

function productNameSimilarity(firstName, secondName) {
  const firstTokens = new Set(normalizeIdentityText(firstName).split(" ").filter(token => token.length > 1));
  const secondTokens = new Set(normalizeIdentityText(secondName).split(" ").filter(token => token.length > 1));
  if (!firstTokens.size || !secondTokens.size) return 0;
  const intersection = [...firstTokens].filter(token => secondTokens.has(token)).length;
  const union = new Set([...firstTokens, ...secondTokens]).size;
  return intersection / union;
}

const VARIANT_CRITICAL_FIELDS = Object.freeze([
  "toolOnly", "storage", "screenSize", "memory", "packageQuantity",
  "bundleContents", "configuration", "capacity", "size", "platform", "edition"
]);

function defaultVariant(product) {
  if (!product || !Array.isArray(product.variants)) return null;
  return product.variants.find(variant => variant.isDefaultVariant) || product.variants[0] || null;
}

function variantCriticalValue(product, key) {
  const variant = defaultVariant(product);
  if (variant && Object.prototype.hasOwnProperty.call(variant, key) && variant[key] !== null && variant[key] !== "" && (!Array.isArray(variant[key]) || variant[key].length)) return variant[key];
  if (product.specifications && Object.prototype.hasOwnProperty.call(product.specifications, key)) return product.specifications[key];
  if (product.identity && Object.prototype.hasOwnProperty.call(product.identity, key)) return product.identity[key];
  return null;
}

function normalizeVariantValue(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (Array.isArray(value)) return value.map(normalizeVariantValue).filter(Boolean).sort().join("|");
  return String(value).normalize("NFKC").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function compareVariantCompatibility(first, second) {
  if (!first || !second) return { compatible:false, conflicts:["missing-product"], reviewRequired:true };
  const conflicts = VARIANT_CRITICAL_FIELDS.filter(field => {
    const firstValue = normalizeVariantValue(variantCriticalValue(first, field));
    const secondValue = normalizeVariantValue(variantCriticalValue(second, field));
    return Boolean(firstValue && secondValue && firstValue !== secondValue);
  });
  return { compatible:conflicts.length === 0, conflicts, reviewRequired:conflicts.length > 0 };
}

function compareProductIdentity(first, second) {
  if (!first || !second) return { isMatch:false, confidence:"low", matchedBy:null, reviewRequired:true };

  const variantCompatibility = compareVariantCompatibility(first, second);
  const finish = candidate => {
    if (!variantCompatibility.compatible) {
      return { isMatch:false, confidence:"low", matchedBy:null, reviewRequired:true, variantCompatibility };
    }
    return { ...candidate, reviewRequired:Boolean(candidate.reviewRequired || variantCompatibility.reviewRequired), variantCompatibility };
  };

  if (exactIdentityMatch(first, second, "upc", normalizeTradeIdentifier)) {
    return finish({ isMatch:true, confidence:"high", matchedBy:"upc", reviewRequired:false });
  }
  if (exactIdentityMatch(first, second, "gtin", normalizeTradeIdentifier)) {
    return finish({ isMatch:true, confidence:"high", matchedBy:"gtin", reviewRequired:false });
  }
  const firstUpc = normalizeTradeIdentifier(identityValue(first, "upc"));
  const secondUpc = normalizeTradeIdentifier(identityValue(second, "upc"));
  const firstGtin = normalizeTradeIdentifier(identityValue(first, "gtin"));
  const secondGtin = normalizeTradeIdentifier(identityValue(second, "gtin"));
  if ((firstUpc && firstUpc === secondGtin) || (firstGtin && firstGtin === secondUpc)) {
    return finish({ isMatch:true, confidence:"high", matchedBy:"gtin", reviewRequired:false });
  }

  const manufacturerMatches = exactIdentityMatch(first, second, "manufacturer", normalizeIdentityText);
  const modelMatches = exactIdentityMatch(first, second, "modelNumber");
  if (manufacturerMatches && modelMatches) {
    return finish({ isMatch:true, confidence:"high", matchedBy:"model", reviewRequired:false });
  }
  if (exactIdentityMatch(first, second, "mpn")) {
    return finish({ isMatch:true, confidence:"high", matchedBy:"mpn", reviewRequired:false });
  }
  if (hasRetailerIdentifierMatch(first, second)) {
    return finish({ isMatch:true, confidence:"high", matchedBy:"retailer-id", reviewRequired:false });
  }

  const firstModel = normalizeModelIdentifier(identityValue(first, "modelNumber"));
  const secondModel = normalizeModelIdentifier(identityValue(second, "modelNumber"));
  if (firstModel && secondModel && firstModel !== secondModel) {
    return finish({ isMatch:false, confidence:"low", matchedBy:null, reviewRequired:true });
  }

  const brandMatches = exactIdentityMatch(first, second, "brand", normalizeIdentityText);
  if (brandMatches && modelMatches) {
    return finish({ isMatch:true, confidence:"medium", matchedBy:"model", reviewRequired:true });
  }

  if (productNameSimilarity(first.name, second.name) >= 0.6) {
    return finish({ isMatch:false, confidence:"low", matchedBy:"name-fallback", reviewRequired:true });
  }
  return finish({ isMatch:false, confidence:"low", matchedBy:null, reviewRequired:true });
}

function runDevelopmentMatchingTests() {
  const source = products[0];
  const consoleProduct = products.find(product => product.id === "ps5-slim");
  const televisionRecord = { name:"Sample TV", specifications:{ screenSize:"55-inch" }, variants:[{ isDefaultVariant:true, size:"55-inch" }] };
  const laptopRecord = products.find(product => product.id === "macbook-air");
  const withoutStrongIdentifiers = { ...source, retailerIdentifiers:{}, identity:{ ...source.identity, upc:null, gtin:null, mpn:null, manufacturer:null } };
  const results = {
    sameUpcAndModel: compareProductIdentity(source, { ...source, id:"development-copy" }),
    formattedBrandModel: compareProductIdentity(withoutStrongIdentifiers, { ...withoutStrongIdentifiers, identity:{ ...withoutStrongIdentifiers.identity, modelNumber:"DCD-771 C2" } }),
    differentModel: compareProductIdentity(withoutStrongIdentifiers, { ...withoutStrongIdentifiers, identity:{ ...withoutStrongIdentifiers.identity, modelNumber:"DCD999" } }),
    similarNameOnly: compareProductIdentity(
      { ...withoutStrongIdentifiers, brand:null, identity:{ ...withoutStrongIdentifiers.identity, brand:null, modelNumber:null }, name:"20V MAX Cordless Drill Kit" },
      { ...withoutStrongIdentifiers, brand:null, identity:{ ...withoutStrongIdentifiers.identity, brand:null, modelNumber:null }, name:"20V Max Cordless Drill Kit Bundle" }
    ),
    sameConfiguration: compareVariantCompatibility(source, { ...source, id:"same-configuration" }),
    toolOnlyVsKit: compareVariantCompatibility(source, { ...source, specifications:{ ...source.specifications, toolOnly:true }, variants:[] }),
    consoleStorageConflict: compareVariantCompatibility(consoleProduct, { ...consoleProduct, specifications:{ ...consoleProduct.specifications, storage:"64 GB" }, variants:[] }),
    televisionSizeConflict: compareVariantCompatibility(televisionRecord, { ...televisionRecord, specifications:{ screenSize:"65 inch" }, variants:[] }),
    laptopConfigurationConflict: compareVariantCompatibility(laptopRecord, { ...laptopRecord, specifications:{ ...laptopRecord.specifications, memory:"16 GB", storage:"512 GB SSD" }, variants:[] }),
    formattedVoltage: normalizeVariantValue("20V MAX") === normalizeVariantValue("20 V MAX"),
    conflictingVariantRejectsIdentity: compareProductIdentity(source, { ...source, specifications:{ ...source.specifications, toolOnly:true }, variants:[] })
  };

  console.assert(results.sameUpcAndModel.isMatch && results.sameUpcAndModel.confidence === "high", "Matching test failed: exact UPC/model");
  console.assert(results.formattedBrandModel.isMatch && results.formattedBrandModel.matchedBy === "model", "Matching test failed: normalized brand/model");
  console.assert(!results.differentModel.isMatch, "Matching test failed: different models must not match");
  console.assert(!results.similarNameOnly.isMatch && results.similarNameOnly.confidence === "low", "Matching test failed: name similarity is only a candidate signal");
  console.assert(results.sameConfiguration.compatible, "Variant test failed: identical configurations must be compatible");
  console.assert(!results.toolOnlyVsKit.compatible && results.toolOnlyVsKit.conflicts.includes("toolOnly"), "Variant test failed: tool-only and kit must conflict");
  console.assert(!results.consoleStorageConflict.compatible && results.consoleStorageConflict.conflicts.includes("storage"), "Variant test failed: console storage must conflict");
  console.assert(!results.televisionSizeConflict.compatible && results.televisionSizeConflict.conflicts.includes("screenSize"), "Variant test failed: television size must conflict");
  console.assert(!results.laptopConfigurationConflict.compatible && results.laptopConfigurationConflict.conflicts.includes("memory") && results.laptopConfigurationConflict.conflicts.includes("storage"), "Variant test failed: laptop memory/storage must conflict");
  console.assert(results.formattedVoltage, "Variant test failed: formatted voltage values must normalize equally");
  console.assert(!results.conflictingVariantRejectsIdentity.isMatch && results.conflictingVariantRejectsIdentity.reviewRequired, "Matching test failed: strong identity must not override a variant conflict");
  return results;
}

const developmentMatchingTestResults = runDevelopmentMatchingTests();
window.PriceAlertMatching = Object.freeze({
  normalizeTradeIdentifier,
  normalizeModelIdentifier,
  normalizeIdentityText,
  normalizeVariantValue,
  productNameSimilarity,
  compareVariantCompatibility,
  compareProductIdentity,
  developmentMatchingTestResults
});

function runDevelopmentOfferTests() {
  const product = products[0];
  const validOffer = { ...product.offers[0], offerId:"test-valid", price:80, salePrice:80, regularPrice:100, currency:"USD", stockStatus:"in-stock", offerStatus:"sample-active" };
  const unavailableOffer = { ...validOffer, offerId:"test-unavailable", price:50, salePrice:50, stockStatus:"out-of-stock" };
  const invalidOffer = { ...validOffer, offerId:"test-invalid", price:"not-a-price", salePrice:null };
  const missingPriceOffer = { ...validOffer, offerId:"test-missing", price:null, salePrice:null };
  const duplicateOffer = { ...validOffer };
  const incompatibleOffer = { ...validOffer, offerId:"test-wrong-variant", variantId:"different-variant", price:20, salePrice:20 };
  const euroOffer = { ...validOffer, offerId:"test-eur", currency:"EUR", price:10, salePrice:10 };
  const mixedOffers = [unavailableOffer, invalidOffer, missingPriceOffer, validOffer, duplicateOffer, incompatibleOffer, euroOffer];
  const sortedUsdOffers = sortOffersByLowestPrice(mixedOffers, { product, currency:"USD" });
  const results = {
    lowestValidAvailable: bestAvailableOffer({ ...product, offers:mixedOffers }, "USD"),
    unavailableIgnored: !sortedUsdOffers.includes(unavailableOffer),
    invalidIgnored: !sortedUsdOffers.includes(invalidOffer),
    missingPriceIgnored: !sortedUsdOffers.includes(missingPriceOffer),
    saleSavingsAmount: calculateOfferSavingsAmount(validOffer),
    saleSavingsPercent: calculateOfferSavingsPercent(validOffer),
    duplicatesStable: sortedUsdOffers.filter(offer => offer.offerId === "test-valid").length === 2,
    incompatibleVariantRejected: !sortedUsdOffers.includes(incompatibleOffer),
    differentCurrencyExcluded: !sortedUsdOffers.includes(euroOffer)
  };

  console.assert(results.lowestValidAvailable === validOffer, "Offer test failed: lowest valid available price");
  console.assert(results.unavailableIgnored, "Offer test failed: unavailable offer must be ignored");
  console.assert(results.invalidIgnored, "Offer test failed: invalid price must be ignored");
  console.assert(results.missingPriceIgnored, "Offer test failed: missing price must be ignored");
  console.assert(results.saleSavingsAmount === 20 && results.saleSavingsPercent === 20, "Offer test failed: sale savings calculation");
  console.assert(results.duplicatesStable, "Offer test failed: duplicate offers must sort safely");
  console.assert(results.incompatibleVariantRejected, "Offer test failed: incompatible variant must be rejected");
  console.assert(results.differentCurrencyExcluded, "Offer test failed: currencies must not be directly compared");
  return results;
}

const developmentOfferTestResults = runDevelopmentOfferTests();
window.PriceAlertOffers = Object.freeze({
  validOfferPrice,
  currentOfferPrice,
  regularAndSalePrice,
  calculateOfferSavingsAmount,
  calculateOfferSavingsPercent,
  isOfferCurrentlyAvailable,
  isOfferCompatibleWithProduct,
  sortOffersByLowestPrice,
  bestAvailableOffer,
  developmentOfferTestResults
});

function runDevelopmentLinkTests() {
  const product = products[0];
  const offer = product.offers[0];
  const affiliate = resolveOfferDestination({ ...offer, affiliateUrl:"https://example.com/affiliate", productUrl:"https://example.com/product" }, product);
  const direct = resolveOfferDestination({ ...offer, affiliateUrl:null, productUrl:"https://example.com/product" }, product);
  const fallback = resolveOfferDestination({ ...offer, affiliateUrl:null, productUrl:"#" }, product);
  const supportedRetailers = products.flatMap(item => item.offers).map(item => item.retailerId).filter((id, index, ids) => ids.indexOf(id) === index);
  const results = {
    affiliateFirst: affiliate && affiliate.linkType === "affiliate" && affiliate.url.includes("/affiliate"),
    productSecond: direct && direct.linkType === "product" && direct.url.includes("/product"),
    hashUsesSearch: fallback && fallback.linkType === "retailer-search" && fallback.url !== "#",
    allRetailersSupported: supportedRetailers.every(retailerId => typeof RETAILER_SEARCH_URLS[retailerId] === "function")
  };
  console.assert(results.affiliateFirst, "Link test failed: affiliate URL must take priority");
  console.assert(results.productSecond, "Link test failed: product URL must be used second");
  console.assert(results.hashUsesSearch, "Link test failed: dead links must use retailer search");
  console.assert(results.allRetailersSupported, "Link test failed: every catalog retailer needs a search URL");
  return results;
}

const developmentLinkTestResults = runDevelopmentLinkTests();
window.PriceAlertLinks = Object.freeze({
  validExternalUrl,
  retailerSearchUrl,
  resolveOfferDestination,
  developmentLinkTestResults
});

function loadSaved() {
  try { return JSON.parse(localStorage.getItem("priceAlertShoppingList") || "[]").filter(id => typeof id === "string"); }
  catch { return []; }
}
function persistSaved() {
  try { localStorage.setItem("priceAlertShoppingList", JSON.stringify(state.saved)); } catch {}
}

function isValidMediaUrl(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const parsed = new URL(value, document.baseURI);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function isAuthorizedProductImage(media) {
  if (!media || !isValidMediaUrl(media.primaryImage)) return false;
  return Boolean(media.imageSource && /(authorized|licensed|permission-granted|owned-asset|public-domain|affiliate-feed|manufacturer-feed|retailer-feed)/i.test(media.imageLicenseOrPermission || ""));
}

function productImageAlt(product) {
  const configuredAlt = product.media && product.media.imageAlt;
  return configuredAlt && configuredAlt.trim() ? configuredAlt.trim() : `${product.brand} ${product.name} product image`;
}

function renderProductMedia(product, { lazy = true } = {}) {
  const media = product.media || {};
  const hasImage = isAuthorizedProductImage(media);
  const altText = productImageAlt(product);
  const placeholderText = product.specifications && product.specifications.visualMark ? product.specifications.visualMark : "PA";
  const placeholderLabel = `Product visual for ${product.brand} ${product.name}`;

  if (!hasImage) {
    return `<div class="product-visual" data-category="${escapeHtml(product.category)}" data-media-kind="placeholder" role="img" aria-label="${escapeHtml(placeholderLabel)}"><span class="product-placeholder">${escapeHtml(placeholderText)}</span></div>`;
  }

  return `<div class="product-visual" data-category="${escapeHtml(product.category)}" data-media-kind="image"><img class="product-image" src="${escapeHtml(media.primaryImage)}" alt="${escapeHtml(altText)}" loading="${lazy ? "lazy" : "eager"}" decoding="async"><span class="product-placeholder" aria-hidden="true" hidden>${escapeHtml(placeholderText)}</span></div>`;
}

function fallbackProductImage(image) {
  if (!image || !image.matches || !image.matches(".product-image")) return false;
  const container = image.closest(".product-visual");
  const placeholder = container && container.querySelector(".product-placeholder");
  if (!container || !placeholder) return false;

  image.hidden = true;
  image.removeAttribute("src");
  placeholder.hidden = false;
  placeholder.setAttribute("aria-hidden", "false");
  container.dataset.mediaKind = "placeholder";
  container.setAttribute("role", "img");
  container.setAttribute("aria-label", `Product visual for ${image.alt || "product image"}`);
  return true;
}

function runDevelopmentMediaTests() {
  const sampleProduct = products[0];
  const syntheticImageUrl = "https://example.invalid/authorized-sample.png";
  const placeholderMarkup = renderProductMedia(sampleProduct);
  const futureImageProduct = {
    ...sampleProduct,
    media: { ...sampleProduct.media, primaryImage: syntheticImageUrl, imageAlt:"Authorized sample product image", imageSource:"development-test", imageLicenseOrPermission:"authorized", mediaStatus:"authorized" }
  };
  const imageMarkup = renderProductMedia(futureImageProduct);
  const testContainer = document.createElement("div");
  testContainer.innerHTML = imageMarkup.replace(` src="${syntheticImageUrl}"`, "");
  const testImage = testContainer.querySelector(".product-image");
  const fallbackApplied = fallbackProductImage(testImage);
  const testPlaceholder = testContainer.querySelector(".product-placeholder");
  const fallbackVisible = Boolean(testPlaceholder && !testPlaceholder.hidden);
  const results = {
    noImageUsesPlaceholder: placeholderMarkup.includes('data-media-kind="placeholder"'),
    primaryImageRendersImage: imageMarkup.includes('class="product-image"') && imageMarkup.includes('loading="lazy"'),
    failedImageUsesPlaceholder: Boolean(fallbackApplied && fallbackVisible && testImage && testImage.hidden),
    imageAltPresent: Boolean(testImage && testImage.alt)
  };

  console.assert(results.noImageUsesPlaceholder, "Media test failed: missing image must use placeholder");
  console.assert(results.primaryImageRendersImage, "Media test failed: primary image must render responsively");
  console.assert(results.failedImageUsesPlaceholder, "Media test failed: broken image must fall back");
  console.assert(results.imageAltPresent, "Media test failed: product image must have alt text");
  return results;
}

const developmentMediaTestResults = runDevelopmentMediaTests();
window.PriceAlertMedia = Object.freeze({
  isValidMediaUrl,
  isAuthorizedProductImage,
  productImageAlt,
  renderProductMedia,
  fallbackProductImage,
  developmentMediaTestResults
});

function savedClass(id) { return state.saved.includes(id) ? " saved" : ""; }
function savedLabel(id) { return state.saved.includes(id) ? "Remove from shopping list" : "Save to shopping list"; }

function initializeOptions() {
  $("#category-grid").innerHTML = categories.map(({name,visualMark}) => {
    const count = products.filter(product => product.category === name).length;
    return `<button class="category-card" type="button" data-category="${escapeHtml(name)}"><span class="category-icon">${visualMark}</span><span><strong>${escapeHtml(name)}</strong><small>${count} products</small></span></button>`;
  }).join("");
  $("#category-filter").insertAdjacentHTML("beforeend", categories.map(({name}) => `<option>${escapeHtml(name)}</option>`).join(""));
  $("#retailer-filter").insertAdjacentHTML("beforeend", retailers.map(name => `<option>${escapeHtml(name)}</option>`).join(""));
}

function searchableText(product) {
  return [product.id,product.slug,product.name,product.brand,product.modelNumber,product.category,product.description,...Object.values(product.specifications),...product.offers.flatMap(item => [item.retailerName,item.retailerProductId,item.retailerSku])].filter(Boolean).join(" ").toLowerCase();
}
function offerMatchesFilters(item, product) {
  if (!isOfferCurrentlyAvailable(item, product)) return false;
  if (state.retailer && item.retailerName !== state.retailer) return false;
  if (state.availability === "pickup" && !item.pickupAvailable && !/pickup/i.test(item.shipping || "")) return false;
  return true;
}
function filteredProducts() {
  const query = state.query.toLowerCase();
  const matches = products.filter(product => {
    if (query && !searchableText(product).includes(query)) return false;
    if (state.category && product.category !== state.category) return false;
    const eligibleOffers = product.offers.filter(item => offerMatchesFilters(item, product));
    if (!eligibleOffers.length) return false;
    const eligibleLowOffer = sortOffersByLowestPrice(eligibleOffers, { product })[0];
    const eligibleLow = eligibleLowOffer ? currentOfferPrice(eligibleLowOffer) : null;
    if (eligibleLow === null) return false;
    if (state.min !== "" && eligibleLow < Number(state.min)) return false;
    if (state.max !== "" && eligibleLow > Number(state.max)) return false;
    return true;
  });
  return matches.sort((a,b) => state.sort === "name" ? a.name.localeCompare(b.name) : state.sort === "high" ? (lowest(b) ?? -Infinity)-(lowest(a) ?? -Infinity) : (lowest(a) ?? Infinity)-(lowest(b) ?? Infinity));
}

function renderResults({scroll=false}={}) {
  const matches = filteredProducts();
  $("#results").hidden = false;
  $("#product-grid").innerHTML = matches.map(product => `
    <article class="product-card">
      ${linkedProductMedia(product)}
      <div class="product-body"><p class="product-brand">${escapeHtml(product.brand)}</p><h3>${productTitleMarkup(product)}</h3>
        <p class="product-meta">Model ${escapeHtml(product.modelNumber)} · ${escapeHtml(product.category)}</p>
        <div class="product-price-row"><div class="from-price"><small>Lowest price</small><strong>${money(lowest(product))}</strong></div><span class="store-count">${product.offers.length} stores<br>offering it</span></div>
        <div class="card-actions"><button class="button button-primary" type="button" data-compare="${product.id}">Compare Prices</button><button class="button button-secondary save-button${savedClass(product.id)}" type="button" data-save="${product.id}" aria-label="${savedLabel(product.id)}" title="${savedLabel(product.id)}">♡</button></div>
      </div>
    </article>`).join("");
  $("#empty-state").hidden = matches.length !== 0;
  $("#product-grid").hidden = matches.length === 0;
  const context = state.query ? ` for “${state.query}”` : state.category ? ` in ${state.category}` : "";
  $("#results-summary").textContent = `${matches.length} product${matches.length === 1 ? "" : "s"}${context}`;
  refreshSaveButtons();
  if (scroll) $("#results").scrollIntoView({behavior:"smooth",block:"start"});
}

function resetFilters() {
  Object.assign(state,{query:"",category:"",retailer:"",min:"",max:"",availability:"",sort:"low"});
  $("#search-input").value = ""; $("#category-filter").value = ""; $("#retailer-filter").value = "";
  $("#min-price").value = ""; $("#max-price").value = ""; $("#availability-filter").value = ""; $("#sort-select").value = "low";
}

function renderDeals() {
  const deals = products.filter(product => discountAmount(product) > 0).sort((a,b) => discountAmount(b)-discountAmount(a)).slice(0,3);
  $("#deal-grid").innerHTML = deals.map(product => {
    const bestOffer = lowestOffer(product);
    const savings = Math.round(calculateOfferSavingsPercent(bestOffer));
    return `<article class="deal-card">${linkedProductMedia(product)}<div><p class="product-brand">${escapeHtml(product.brand)}</p><h3>${productTitleMarkup(product)}</h3><div class="deal-prices"><strong>${money(currentOfferPrice(bestOffer), bestOffer.currency)}</strong><del>${money(bestOffer.regularPrice, bestOffer.currency)}</del></div><p class="savings">Save ${savings}% on this offer</p><button class="text-button" type="button" data-compare="${product.id}">Compare prices →</button></div></article>`;
  }).join("");
}

function showComparison(id) {
  const product = products.find(item => item.id === id); if (!product) return;
  const offers = sortOffersByLowestPrice(product.offers, { product });
  const historyPrices = product.priceHistory.map(entry => entry.price);
  const minHistory = Math.min(...historyPrices), maxHistory = Math.max(...historyPrices);
  const range = Math.max(maxHistory-minHistory,1);
  $("#comparison-content").innerHTML = `
    <div class="comparison-top">${renderProductMedia(product, { lazy:false })}<div><p class="product-brand">${escapeHtml(product.brand)} · ${escapeHtml(product.category)}</p><h2 id="comparison-title">${escapeHtml(product.name)}</h2><p>Model ${escapeHtml(product.modelNumber)} · Item ${escapeHtml(product.specifications.itemNumber)} · UPC ${escapeHtml(product.specifications.upc)}</p><p>${escapeHtml(product.description)}</p></div><div class="comparison-actions"><button class="button button-secondary save-button${savedClass(product.id)}" type="button" data-save="${product.id}">♡ ${state.saved.includes(product.id)?"Saved":"Save to Shopping List"}</button><button class="text-button" type="button" data-close-comparison>Close comparison</button></div></div>
    <div class="comparison-grid"><div class="panel"><h3>Compare retailer offers</h3><div class="offer-list">${offers.map((item,index) => { const savings = calculateOfferSavingsAmount(item); const destination = resolveOfferDestination(item, product); return `<article class="offer-card${index===0?" best":""}"><div><span class="retailer-name">${escapeHtml(item.retailerName)}</span>${index===0?'<span class="best-badge">Best Price</span>':""}</div><div><div>${escapeHtml(item.availability)}</div><div class="offer-detail">${escapeHtml(item.shipping || "Shipping details vary")}${savings > 0 ? ` · Save ${money(savings, item.currency)}` : ""}</div></div><div class="offer-price">${money(currentOfferPrice(item), item.currency)}</div>${destination ? `<a class="button button-primary" href="${escapeHtml(destination.url)}" target="_blank" rel="noopener noreferrer sponsored" data-retailer-link="${destination.linkType}">${escapeHtml(destination.label)}</a>` : ""}</article>`; }).join("")}</div></div>
    <aside class="panel"><h3>Price history</h3><div class="history-chart" aria-label="Six-month price history">${product.priceHistory.map((entry,index) => `<div class="history-bar" style="--height:${35+((entry.price-minHistory)/range)*65}%" data-price="${money(entry.price)}" title="${escapeHtml(entry.label)}: ${money(entry.price)}"></div>`).join("")}</div><div class="history-labels"><span>6 months ago</span><span>Current</span></div>
      <div data-target-alert-mount></div>
    </aside></div>`;
  alertStorage.mountTargetAlert($("#comparison-content [data-target-alert-mount]"), { product, currentLowestPrice:currentOfferPrice(offers[0]), currency:offers[0].currency });
  $("#comparison").hidden = false;
  $("#comparison").scrollIntoView({behavior:"smooth",block:"start"});
}

function toggleSave(id) {
  const index = state.saved.indexOf(id);
  if (index >= 0) { state.saved.splice(index,1); showToast("Removed from your shopping list."); }
  else { state.saved.push(id); showToast("Saved to your shopping list."); }
  persistSaved(); renderShoppingList(); refreshSaveButtons();
}
function refreshSaveButtons() {
  document.querySelectorAll("[data-save]").forEach(button => {
    const saved = state.saved.includes(button.dataset.save);
    button.classList.toggle("saved",saved); button.setAttribute("aria-label",saved?"Remove from shopping list":"Save to shopping list");
    if (button.closest(".comparison-actions")) button.textContent = saved ? "♡ Saved" : "♡ Save to Shopping List";
  });
  $("#nav-list-count").textContent = state.saved.length;
}
function renderShoppingList() {
  const savedProducts = state.saved.map(id => products.find(product => product.id===id)).filter(Boolean);
  $("#clear-list").hidden = !savedProducts.length;
  $("#shopping-list-items").innerHTML = savedProducts.length ? savedProducts.map(product => `<article class="saved-item"><div><strong>${escapeHtml(product.brand)} ${escapeHtml(product.name)}</strong><small>From ${money(lowest(product))} · ${escapeHtml(product.category)}</small></div><button class="remove-item" type="button" data-save="${product.id}" aria-label="Remove ${escapeHtml(product.name)}">×</button></article>`).join("") : '<p class="list-empty">Your shopping list is empty. Save a product to keep it here.</p>';
  refreshSaveButtons();
}

const dialogCopy = {
  about:["About Price Alert","Price Alert helps shoppers find products, compare retailer offers, review price history, and organize purchase decisions."],
  privacy:["Privacy","Shopping List selections are stored only in your browser using localStorage. Price-alert form entries are processed within this page and are not transmitted to Price Alert."],
  terms:["Terms","Product details, prices, availability, shipping, and destination links can change. Verify all offer information directly with the retailer before making a purchase."],
  contact:["Contact","For questions about Price Alert, please contact the site operator."]
};
let toastTimer;
function showToast(message) { const toast=$("#toast"); toast.textContent=message; toast.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.hidden=true,2600); }

$("#search-form").addEventListener("submit", event => { event.preventDefault(); state.query=$("#search-input").value.trim(); state.category=""; $("#category-filter").value=""; renderResults({scroll:true}); });
$("#search-input").addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); $("#search-form").requestSubmit(); } });
$("#category-grid").addEventListener("click", event => { const button=event.target.closest("[data-category]"); if(!button)return; resetFilters(); state.category=button.dataset.category; $("#category-filter").value=state.category; renderResults({scroll:true}); });
["category-filter","retailer-filter","availability-filter","sort-select"].forEach(id => $("#"+id).addEventListener("change", event => { const keys={"category-filter":"category","retailer-filter":"retailer","availability-filter":"availability","sort-select":"sort"}; state[keys[id]]=event.target.value; renderResults(); }));
["min-price","max-price"].forEach(id => $("#"+id).addEventListener("input", event => { state[id==="min-price"?"min":"max"]=event.target.value; renderResults(); }));
$("#clear-search").addEventListener("click",()=>{ resetFilters(); $("#results").hidden=true; $("#comparison").hidden=true; $("#top").scrollIntoView({behavior:"smooth"}); });
$("#filter-toggle").addEventListener("click",()=>$("#filters").classList.add("open"));
$("#filter-close").addEventListener("click",()=>$("#filters").classList.remove("open"));
$("#menu-toggle").addEventListener("click",event=>{ const open=$("#main-nav").classList.toggle("open"); event.currentTarget.setAttribute("aria-expanded",open); });
$("#main-nav").addEventListener("click",()=>{ $("#main-nav").classList.remove("open"); $("#menu-toggle").setAttribute("aria-expanded","false"); });

document.addEventListener("click", event => {
  const compare=event.target.closest("[data-compare]"); if(compare) showComparison(compare.dataset.compare);
  const save=event.target.closest("[data-save]"); if(save) toggleSave(save.dataset.save);
  if(event.target.closest("[data-close-comparison]")) $("#comparison").hidden=true;
  const dialogButton=event.target.closest("[data-dialog]"); if(dialogButton) { const [title,copy]=dialogCopy[dialogButton.dataset.dialog]; $("#dialog-content").innerHTML=`<h2 id="dialog-title">${title}</h2><p>${copy}</p>`; $("#info-dialog").showModal(); }
});
document.addEventListener("error", event => { if (event.target && event.target.matches && event.target.matches(".product-image")) fallbackProductImage(event.target); }, true);
$("#clear-list").addEventListener("click",()=>{ state.saved=[]; persistSaved(); renderShoppingList(); showToast("Shopping list cleared."); });
$("#dialog-close").addEventListener("click",()=>$("#info-dialog").close());
$("#info-dialog").addEventListener("click",event=>{ if(event.target===$("#info-dialog")) $("#info-dialog").close(); });

initializeOptions();
const initialCategory = new URLSearchParams(window.location.search).get("category");
if (initialCategory && categories.some(category => category.name === initialCategory)) {
  state.category = initialCategory;
  $("#category-filter").value = initialCategory;
  renderResults();
}
renderDeals(); renderShoppingList();
});
