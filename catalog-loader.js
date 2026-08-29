(function () {
  "use strict";

  const fallbackCatalog = window.PriceAlertData;
  const blockedStatus = /sample|development|fixture|test|demo|unverified/i;
  const approvedImagePermission = /(authorized|licensed|permission-granted|owned-asset|public-domain|affiliate-feed|manufacturer-feed|retailer-feed)/i;

  function httpUrl(value) {
    if (!value) return true;
    try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
  }

  function productionProductIsSafe(product) {
    const hasPrivateFields=value=>Array.isArray(value)?value.some(hasPrivateFields):Boolean(value&&typeof value==="object"&&Object.entries(value).some(([key,item])=>/^(email|customerEmail|customer_email|password)$/i.test(key)||hasPrivateFields(item)));
    if (!product || !product.id || !product.slug || product.dataStatus !== "production-approved" || blockedStatus.test(JSON.stringify(product.sourceMetadata || {})) || hasPrivateFields(product)) return false;
    const media = product.media || {};
    const images = [media.primaryImage, media.thumbnail, ...(Array.isArray(media.galleryImages) ? media.galleryImages : [])].filter(Boolean);
    if (images.length && (images.some(image => !httpUrl(image)) || !media.imageSource || !approvedImagePermission.test(media.imageLicenseOrPermission || ""))) return false;
    return (product.offers || []).every(offer => !offer.productUrl || httpUrl(offer.productUrl)) && (product.offers || []).every(offer => !offer.affiliateUrl || httpUrl(offer.affiliateUrl));
  }

  function catalogFromProducts(products) {
    const fallbackCategories = new Map((fallbackCatalog.categories || []).map(category => [category.name, category]));
    const categoryNames = [...new Set(products.map(product => product.category).filter(Boolean))];
    const retailers = [...new Map(products.flatMap(product => product.offers || []).filter(offer => offer.retailerId && offer.retailerName).map(offer => [offer.retailerId, { id:offer.retailerId, displayName:offer.retailerName }])).values()];
    return {
      ...(fallbackCatalog || {}),
      products,
      categories:categoryNames.map(name => fallbackCategories.get(name) || { name, visualMark:name.slice(0, 2).toUpperCase() }),
      retailers,
      dataStatus:"production-approved",
      catalogSource:"generated-production"
    };
  }

  async function loadCatalog() {
    if (!fallbackCatalog || !Array.isArray(fallbackCatalog.products)) throw new Error("The fallback catalog failed to load.");
    if (window.location.protocol === "file:") return fallbackCatalog;
    const script = document.currentScript;
    const catalogUrl = script && script.dataset.catalogUrl ? script.dataset.catalogUrl : "data/catalog.generated.json";
    try {
      const response = await fetch(catalogUrl, { cache:"no-cache", credentials:"same-origin" });
      if (!response.ok) return fallbackCatalog;
      const generated = await response.json();
      if (!generated || !Array.isArray(generated.products) || !generated.products.length || !generated.products.every(productionProductIsSafe)) {
        console.warn("Price Alert rejected an unsafe or non-production generated catalog and kept the fallback catalog.");
        return fallbackCatalog;
      }
      const productionCatalog = catalogFromProducts(generated.products);
      window.PriceAlertData = productionCatalog;
      return productionCatalog;
    } catch (error) {
      console.info("Price Alert generated catalog was unavailable; using the fallback catalog.");
      return fallbackCatalog;
    }
  }

  window.PriceAlertCatalogLoader = Object.freeze({ httpUrl, productionProductIsSafe, catalogFromProducts, loadCatalog });
  window.PriceAlertCatalogReady = loadCatalog();
}());
