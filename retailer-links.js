(function () {
  "use strict";

  const RETAILER_SEARCH_URLS = Object.freeze({
    lowes: query => `https://www.lowes.com/search?searchTerm=${encodeURIComponent(query)}`,
    "home-depot": query => `https://www.homedepot.com/s/${encodeURIComponent(query)}`,
    walmart: query => `https://www.walmart.com/search?q=${encodeURIComponent(query)}`,
    "best-buy": query => `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(query)}`,
    ebay: query => `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`,
    amazon: query => `https://www.amazon.com/s?k=${encodeURIComponent(query)}`,
    target: query => `https://www.target.com/s?searchTerm=${encodeURIComponent(query)}`
  });

  function validExternalUrl(value) {
    if (typeof value !== "string" || !value.trim() || value.trim() === "#") return null;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
    } catch {
      return null;
    }
  }

  function retailerSearchUrl(offer, product) {
    const builder = RETAILER_SEARCH_URLS[offer && offer.retailerId];
    if (!builder || !product) return null;
    const query = [product.brand, product.modelNumber, product.name].filter(Boolean).join(" ");
    return query ? builder(query) : null;
  }

  function resolveOfferDestination(offer, product) {
    const affiliateUrl = validExternalUrl(offer && offer.affiliateUrl);
    if (affiliateUrl) return { url:affiliateUrl, linkType:"affiliate", label:`View at ${offer.retailerName}` };
    const productUrl = validExternalUrl(offer && offer.productUrl);
    if (productUrl) return { url:productUrl, linkType:"product", label:`View at ${offer.retailerName}` };
    const searchUrl = retailerSearchUrl(offer, product);
    return searchUrl ? { url:searchUrl, linkType:"retailer-search", label:`Search ${offer.retailerName}` } : null;
  }

  window.PriceAlertRetailerLinks = Object.freeze({
    retailerSearchUrls: RETAILER_SEARCH_URLS,
    validExternalUrl,
    retailerSearchUrl,
    resolveOfferDestination
  });
}());
