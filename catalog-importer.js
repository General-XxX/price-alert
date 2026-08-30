(function () {
  "use strict";
  const mediaResolver=typeof window!=="undefined"?window.PriceAlertMediaResolver:require("./media-resolver.js");
  if(!mediaResolver)throw new Error("Price Alert media resolver failed to load.");

  const RETAILER_IDS = Object.freeze({ "lowe's":"lowes", "lowes":"lowes", "home depot":"home-depot", "walmart":"walmart", "best buy":"best-buy", "ebay":"ebay", "amazon":"amazon", "target":"target" });
  const text = value => value === null || value === undefined || String(value).trim() === "" ? null : String(value).trim();
  const number = value => {
    if (value === null || value === undefined || value === "") return null;
    const normalized = typeof value === "string" ? value.replace(/[$,]/g, "").trim() : value;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  };
  const boolean = value => value === true || String(value).trim().toLowerCase() === "true" ? true : value === false || String(value).trim().toLowerCase() === "false" ? false : null;
  const slugify = value => text(value) ? String(value).normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : null;

  function structured(value, fallback) {
    if (value === null || value === undefined || value === "") return fallback;
    if (typeof value === "object") return value;
    try { return JSON.parse(value); } catch { return fallback; }
  }

  function httpUrl(value) {
    const candidate = text(value);
    if (!candidate) return null;
    try {
      const url = new URL(candidate);
      return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch { return null; }
  }

  function normalizeMedia(record) {
    return mediaResolver.normalizeMedia({...record,media:structured(record.media||record.mediaJson,{})||{}},record.sourceMetadata||{});
  }

  function normalizeVariant(variant, index, productId) {
    return {
      variantId: text(variant.variantId || variant.id) || `${productId}-variant-${index + 1}`,
      variantName: text(variant.variantName || variant.name),
      color: text(variant.color), size: text(variant.size), capacity: text(variant.capacity), storage: text(variant.storage),
      configuration: text(variant.configuration),
      bundleContents: Array.isArray(structured(variant.bundleContents, [])) ? structured(variant.bundleContents, []) : [],
      modelNumber: text(variant.modelNumber || variant.model), mpn: text(variant.mpn), upc: text(variant.upc), gtin: text(variant.gtin), sku: text(variant.sku),
      isDefaultVariant: boolean(variant.isDefaultVariant) ?? index === 0,
      variantStatus: text(variant.variantStatus || variant.status)
    };
  }

  function normalizeOffer(offer, index, product) {
    const retailerName = text(offer.retailerName || offer.retailer || offer.store);
    const retailerId = text(offer.retailerId) || RETAILER_IDS[(retailerName || "").toLowerCase()] || null;
    const price = number(offer.price ?? offer.currentPrice);
    const regularPrice = number(offer.regularPrice ?? offer.listPrice);
    const salePrice = number(offer.salePrice);
    const currentPrice = salePrice ?? price;
    const savingsAmount = currentPrice !== null && regularPrice !== null && regularPrice > currentPrice ? Number((regularPrice - currentPrice).toFixed(2)) : 0;
    return {
      ...offer,
      offerId: text(offer.offerId || offer.id) || `${product.id}-${retailerId || "retailer"}-${index + 1}`,
      retailerId, retailerName,
      retailerProductId: text(offer.retailerProductId), retailerSku: text(offer.retailerSku || offer.sku), retailerModelNumber: text(offer.retailerModelNumber || offer.modelNumber),
      variantId: text(offer.variantId), price, regularPrice, salePrice,
      savingsAmount, savingsPercent: savingsAmount > 0 && regularPrice > 0 ? Number((savingsAmount / regularPrice * 100).toFixed(2)) : 0,
      currency: text(offer.currency), saleStatus: text(offer.saleStatus), availability: text(offer.availability), stockStatus: text(offer.stockStatus), quantityAvailable: number(offer.quantityAvailable),
      shippingAvailable: boolean(offer.shippingAvailable), shippingPrice: number(offer.shippingPrice), freeShipping: boolean(offer.freeShipping), pickupAvailable: boolean(offer.pickupAvailable), pickupStore: text(offer.pickupStore), deliveryEstimate: text(offer.deliveryEstimate),
      productUrl: httpUrl(offer.productUrl), affiliateUrl: httpUrl(offer.affiliateUrl), affiliateProgram: text(offer.affiliateProgram), affiliateTrackingStatus: text(offer.affiliateTrackingStatus),
      lastChecked: text(offer.lastChecked), lastPriceChange: text(offer.lastPriceChange), offerStatus: text(offer.offerStatus), dataSource: text(offer.dataSource), dataStatus: text(offer.dataStatus),
      shipping: text(offer.shipping), storeLocation: structured(offer.storeLocation, null)
    };
  }

  function normalizePriceHistory(value) {
    const entries = structured(value, []);
    return Array.isArray(entries) ? entries.map((entry, index) => typeof entry === "number" ? { recordedAt:null, label:`Entry ${index + 1}`, price:entry, currency:null } : { recordedAt:text(entry.recordedAt || entry.date), label:text(entry.label), price:number(entry.price), currency:text(entry.currency) }).filter(entry => entry.price !== null) : [];
  }

  function normalizeProduct(record, options = {}) {
    const brand = text(record.brand);
    const name = text(record.name || record.productName || record.title);
    const modelNumber = text(record.modelNumber || record.model);
    const id = text(record.id || record.productId) || slugify([brand, modelNumber, name].filter(Boolean).join(" "));
    if (!id || !name) return { product:null, error:"Each product requires a name and enough identity data to create an ID." };
    const rawIdentity = structured(record.identity || record.identityJson, {}) || {};
    const specifications = structured(record.specifications || record.specificationsJson, {}) || {};
    const rawVariants = structured(record.variants || record.variantsJson, []);
    const rawOffers = structured(record.offers || record.offersJson, []);
    const product = {
      ...record,
      id, familyId:text(record.familyId) || id, slug:text(record.slug) || slugify([brand, modelNumber].filter(Boolean).join(" ")) || id,
      brand, name, modelNumber, category:text(record.category), description:text(record.description),
      media:normalizeMedia(record),
      identity:{ ...rawIdentity, brand:text(rawIdentity.brand) || brand, manufacturer:text(rawIdentity.manufacturer), modelNumber:text(rawIdentity.modelNumber) || modelNumber, mpn:text(rawIdentity.mpn || record.mpn), upc:text(rawIdentity.upc || record.upc), gtin:text(rawIdentity.gtin || record.gtin), sku:text(rawIdentity.sku || record.sku), color:text(rawIdentity.color || record.color), size:text(rawIdentity.size || record.size), variant:text(rawIdentity.variant), packageQuantity:number(rawIdentity.packageQuantity ?? record.packageQuantity) },
      retailerIdentifiers:structured(record.retailerIdentifiers || record.retailerIdentifiersJson, {}) || {},
      matching:structured(record.matching, { matchStatus:"not-evaluated", matchConfidence:"not-evaluated", matchedBy:[], reviewRequired:true }),
      specifications,
      variants:Array.isArray(rawVariants) ? rawVariants.map((variant, index) => normalizeVariant(variant, index, id)) : [],
      offers:[], priceHistory:normalizePriceHistory(record.priceHistory || record.priceHistoryJson),
      sourceMetadata:structured(record.sourceMetadata || record.source || record.sourceMetadataJson, {}) || {},
      lastUpdated:text(record.lastUpdated), dataStatus:text(record.dataStatus) || text(options.dataStatus)
    };
    product.offers = Array.isArray(rawOffers) ? rawOffers.map((offer, index) => normalizeOffer(offer, index, product)) : [];
    return { product, error:null };
  }

  function parseCsv(textValue) {
    const rows = [];
    let row = [], cell = "", quoted = false;
    for (let index = 0; index < textValue.length; index += 1) {
      const character = textValue[index];
      if (character === '"' && quoted && textValue[index + 1] === '"') { cell += '"'; index += 1; }
      else if (character === '"') quoted = !quoted;
      else if (character === "," && !quoted) { row.push(cell); cell = ""; }
      else if ((character === "\n" || character === "\r") && !quoted) { if (character === "\r" && textValue[index + 1] === "\n") index += 1; row.push(cell); if (row.some(value => value !== "")) rows.push(row); row = []; cell = ""; }
      else cell += character;
    }
    row.push(cell); if (row.some(value => value !== "")) rows.push(row);
    if (rows.length < 2) return [];
    const headers = rows[0].map(header => header.trim());
    return rows.slice(1).map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
  }

  function importBatch(input, options = {}) {
    let records = input;
    try {
      if (typeof input === "string") records = options.format === "csv" ? parseCsv(input) : JSON.parse(input);
    } catch (error) { return { products:[], errors:[`Input could not be parsed: ${error.message}`] }; }
    if (!Array.isArray(records)) return { products:[], errors:["Batch input must resolve to an array of product records."] };
    const products = [], errors = [];
    records.forEach((record, index) => { const result = normalizeProduct(record || {}, options); if (result.product) products.push(result.product); else errors.push(`Record ${index + 1}: ${result.error}`); });
    return { products, errors };
  }

  const api = Object.freeze({ importBatch, normalizeProduct, normalizeOffer, normalizeMedia, parseCsv });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.PriceAlertImporter = api;
}());
