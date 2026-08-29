// Interface logic consumes the catalog contract exposed by products.js.
const catalog = window.PriceAlertData;

if (!catalog || !Array.isArray(catalog.products) || !Array.isArray(catalog.categories)) {
  throw new Error("Price Alert product data failed to load.");
}

const products = catalog.products;
const categories = catalog.categories;
const retailers = catalog.retailers || [...new Set(products.flatMap(product => product.offers.map(item => item.retailer)))];
const state = { query:"", category:"", retailer:"", min:"", max:"", availability:"", sort:"low", saved:loadSaved() };
const $ = (selector) => document.querySelector(selector);
const money = (value) => new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" }).format(value);
const lowest = (product) => Math.min(...product.offers.map(item => item.price));
const lowestOffer = (product) => [...product.offers].sort((a,b) => a.price-b.price)[0];
const discountAmount = (product) => {
  const bestOffer = lowestOffer(product);
  return Math.max(0, (bestOffer.regularPrice || bestOffer.price) - bestOffer.price);
};
const offerDestination = (item) => item.affiliateUrl || item.productUrl || "#";
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

function productImageAlt(product) {
  const configuredAlt = product.media && product.media.imageAlt;
  return configuredAlt && configuredAlt.trim() ? configuredAlt.trim() : `${product.brand} ${product.name} product image`;
}

function renderProductMedia(product, { lazy = true } = {}) {
  const media = product.media || {};
  const hasImage = isValidMediaUrl(media.primaryImage);
  const altText = productImageAlt(product);
  const placeholderText = product.specifications && product.specifications.visualMark ? product.specifications.visualMark : "PA";
  const placeholderLabel = `Development placeholder for ${product.brand} ${product.name}`;

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
  container.setAttribute("aria-label", `Development placeholder for ${image.alt || "product image"}`);
  return true;
}

function runDevelopmentMediaTests() {
  const sampleProduct = products[0];
  const syntheticImageUrl = "https://example.invalid/authorized-sample.png";
  const placeholderMarkup = renderProductMedia(sampleProduct);
  const futureImageProduct = {
    ...sampleProduct,
    media: { ...sampleProduct.media, primaryImage: syntheticImageUrl, imageAlt:"Authorized sample product image", mediaStatus:"authorized" }
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
    return `<button class="category-card" type="button" data-category="${escapeHtml(name)}"><span class="category-icon">${visualMark}</span><span><strong>${escapeHtml(name)}</strong><small>${count} sample products</small></span></button>`;
  }).join("");
  $("#category-filter").insertAdjacentHTML("beforeend", categories.map(({name}) => `<option>${escapeHtml(name)}</option>`).join(""));
  $("#retailer-filter").insertAdjacentHTML("beforeend", retailers.map(name => `<option>${escapeHtml(name)}</option>`).join(""));
}

function searchableText(product) {
  return [product.id,product.slug,product.name,product.brand,product.modelNumber,product.category,product.description,...Object.values(product.specifications),...product.offers.flatMap(item => [item.retailer,item.retailerProductId])].filter(Boolean).join(" ").toLowerCase();
}
function offerMatchesFilters(item) {
  if (state.retailer && item.retailer !== state.retailer) return false;
  if (state.availability === "available" && /out of stock/i.test(item.availability)) return false;
  if (state.availability === "pickup" && !/pickup/i.test(item.shipping)) return false;
  return true;
}
function filteredProducts() {
  const query = state.query.toLowerCase();
  const matches = products.filter(product => {
    if (query && !searchableText(product).includes(query)) return false;
    if (state.category && product.category !== state.category) return false;
    const eligibleOffers = product.offers.filter(offerMatchesFilters);
    if (!eligibleOffers.length) return false;
    const eligibleLow = Math.min(...eligibleOffers.map(item => item.price));
    if (state.min !== "" && eligibleLow < Number(state.min)) return false;
    if (state.max !== "" && eligibleLow > Number(state.max)) return false;
    return true;
  });
  return matches.sort((a,b) => state.sort === "name" ? a.name.localeCompare(b.name) : state.sort === "high" ? lowest(b)-lowest(a) : lowest(a)-lowest(b));
}

function renderResults({scroll=false}={}) {
  const matches = filteredProducts();
  $("#results").hidden = false;
  $("#product-grid").innerHTML = matches.map(product => `
    <article class="product-card">
      ${renderProductMedia(product)}
      <div class="product-body"><p class="product-brand">${escapeHtml(product.brand)}</p><h3>${escapeHtml(product.name)}</h3>
        <p class="product-meta">Model ${escapeHtml(product.modelNumber)} · ${escapeHtml(product.category)}</p>
        <div class="product-price-row"><div class="from-price"><small>Lowest sample price</small><strong>${money(lowest(product))}</strong></div><span class="store-count">${product.offers.length} stores<br>offering it</span></div>
        <div class="card-actions"><button class="button button-primary" type="button" data-compare="${product.id}">Compare Prices</button><button class="button button-secondary save-button${savedClass(product.id)}" type="button" data-save="${product.id}" aria-label="${savedLabel(product.id)}" title="${savedLabel(product.id)}">♡</button></div>
      </div>
    </article>`).join("");
  $("#empty-state").hidden = matches.length !== 0;
  $("#product-grid").hidden = matches.length === 0;
  const context = state.query ? ` for “${state.query}”` : state.category ? ` in ${state.category}` : "";
  $("#results-summary").textContent = `${matches.length} sample product${matches.length === 1 ? "" : "s"}${context}`;
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
    const savings = Math.round((1-bestOffer.price/bestOffer.regularPrice)*100);
    return `<article class="deal-card">${renderProductMedia(product)}<div><p class="product-brand">${escapeHtml(product.brand)}</p><h3>${escapeHtml(product.name)}</h3><div class="deal-prices"><strong>${money(bestOffer.price)}</strong><del>${money(bestOffer.regularPrice)}</del></div><p class="savings">Save ${savings}% in this sample offer</p><button class="text-button" type="button" data-compare="${product.id}">Compare sample prices →</button></div></article>`;
  }).join("");
}

function showComparison(id) {
  const product = products.find(item => item.id === id); if (!product) return;
  const offers = [...product.offers].sort((a,b) => a.price-b.price);
  const historyPrices = product.priceHistory.map(entry => entry.price);
  const minHistory = Math.min(...historyPrices), maxHistory = Math.max(...historyPrices);
  const range = Math.max(maxHistory-minHistory,1);
  $("#comparison-content").innerHTML = `
    <div class="comparison-top">${renderProductMedia(product, { lazy:false })}<div><p class="product-brand">${escapeHtml(product.brand)} · ${escapeHtml(product.category)}</p><h2 id="comparison-title">${escapeHtml(product.name)}</h2><p>Model ${escapeHtml(product.modelNumber)} · Item ${escapeHtml(product.specifications.itemNumber)} · UPC ${escapeHtml(product.specifications.upc)}</p><p>${escapeHtml(product.description)}</p></div><div class="comparison-actions"><button class="button button-secondary save-button${savedClass(product.id)}" type="button" data-save="${product.id}">♡ ${state.saved.includes(product.id)?"Saved":"Save to Shopping List"}</button><button class="text-button" type="button" data-close-comparison>Close comparison</button></div></div>
    <div class="comparison-grid"><div class="panel"><h3>Compare sample retailer offers</h3><div class="offer-list">${offers.map((item,index) => `<article class="offer-card${index===0?" best":""}"><div><span class="retailer-name">${escapeHtml(item.retailer)}</span>${index===0?'<span class="best-badge">Best Price</span>':""}</div><div><div>${escapeHtml(item.availability)}</div><div class="offer-detail">${escapeHtml(item.shipping)}</div></div><div class="offer-price">${money(item.price)}</div><a class="button button-primary" href="${offerDestination(item)}" data-sample-link>View Deal</a></article>`).join("")}</div></div>
    <aside class="panel"><h3>Development price history</h3><div class="history-chart" aria-label="Six-month sample price history">${product.priceHistory.map((entry,index) => `<div class="history-bar" style="--height:${35+((entry.price-minHistory)/range)*65}%" data-price="${money(entry.price)}" title="${escapeHtml(entry.label)}: ${money(entry.price)}"></div>`).join("")}</div><div class="history-labels"><span>6 months ago</span><span>Current sample</span></div>
      <div class="alert-box"><h3>Price Drop Alert</h3><p>Set a target for this product. Alerts are not active in this development version.</p><form class="alert-form" data-alert-form><input type="email" name="email" required placeholder="Email address" aria-label="Email address"><input type="number" name="price" min="1" step=".01" required placeholder="Desired price" aria-label="Desired price"><button class="button button-primary" type="submit">Set Price Alert</button></form><p class="alert-message" data-alert-message hidden></p></div>
    </aside></div>`;
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
  about:["About Price Alert","Price Alert is an early front-end concept for finding products, comparing retailer offers, and organizing purchase decisions. All current catalog information is sample development data."],
  privacy:["Privacy","This development version does not send account or alert data to a server. The shopping list is stored only in your browser using localStorage. A production privacy policy will be required before launch."],
  terms:["Terms","Current products, offers, availability, price history, and destination links are demonstrations only and should not be used as purchasing information. Production terms will be added before launch."],
  contact:["Contact","Customer support and business contact channels have not launched yet. A real contact form or support service will require a backend or external provider."]
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
  if(event.target.closest("[data-sample-link]")) { event.preventDefault(); showToast("Sample destination only — affiliate retailer links are not connected yet."); }
  const dialogButton=event.target.closest("[data-dialog]"); if(dialogButton) { const [title,copy]=dialogCopy[dialogButton.dataset.dialog]; $("#dialog-content").innerHTML=`<h2 id="dialog-title">${title}</h2><p>${copy}</p>`; $("#info-dialog").showModal(); }
});
document.addEventListener("submit", event => { if(!event.target.matches("[data-alert-form]"))return; event.preventDefault(); const message=event.target.parentElement.querySelector("[data-alert-message]"); message.textContent="Your request is saved as a preview only. Price alerts will become active when the live alert service launches."; message.hidden=false; event.target.reset(); });
document.addEventListener("error", event => { if (event.target && event.target.matches && event.target.matches(".product-image")) fallbackProductImage(event.target); }, true);
$("#clear-list").addEventListener("click",()=>{ state.saved=[]; persistSaved(); renderShoppingList(); showToast("Shopping list cleared."); });
$("#dialog-close").addEventListener("click",()=>$("#info-dialog").close());
$("#info-dialog").addEventListener("click",event=>{ if(event.target===$("#info-dialog")) $("#info-dialog").close(); });

initializeOptions(); renderDeals(); renderShoppingList();
