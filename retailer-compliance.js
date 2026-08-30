(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PriceAlertRetailerCompliance = api;
}(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  const restrictiveDefault = Object.freeze({
    retailer:"Unknown retailer", affiliateStatus:"unverified", allowAffiliateLink:false,
    allowPriceComparison:false, allowPriceTracking:false, allowPriceHistory:false,
    allowPriceAlerts:false, allowAlertEmailPromotion:false, requiresNearLinkDisclosure:false,
    allowAutomatedDataImport:false, allowScraping:false, aiDataProcessingAllowed:false,
    dataSourceRestrictions:"No use is permitted until the retailer and data source are expressly reviewed and approved.",
    notes:"Unknown retailers fail closed."
  });

  const records = {
    ebay:{ retailer:"eBay", affiliateStatus:"active", allowAffiliateLink:true, allowPriceComparison:true, allowPriceTracking:true, allowPriceHistory:true, allowPriceAlerts:true, allowAlertEmailPromotion:false, requiresNearLinkDisclosure:true, allowAutomatedDataImport:true, allowScraping:false, aiDataProcessingAllowed:false, dataSourceRestrictions:"Use only approved eBay/EPN feeds, APIs, links, or other authorized data sources. Non-public protected eBay/EPN data must not be sent for AI processing.", notes:"Price monitoring features require an authorized approved data source. Email promotion remains disabled until written approval." },
    lowes:{ retailer:"Lowe's", affiliateStatus:"pending", allowAffiliateLink:false, allowPriceComparison:false, allowPriceTracking:false, allowPriceHistory:false, allowPriceAlerts:false, allowAlertEmailPromotion:false, requiresNearLinkDisclosure:true, allowAutomatedDataImport:false, allowScraping:false, aiDataProcessingAllowed:false, dataSourceRestrictions:"Use only an expressly approved Lowe's data source after program approval.", notes:"Affiliate, comparison, monitoring, alert, AI-processing, and email-promotion capabilities remain disabled while approval is pending." },
    walmart:{ retailer:"Walmart", affiliateStatus:"pending", allowAffiliateLink:false, allowPriceComparison:false, allowPriceTracking:false, allowPriceHistory:false, allowPriceAlerts:false, allowAlertEmailPromotion:false, requiresNearLinkDisclosure:true, allowAutomatedDataImport:false, allowScraping:false, aiDataProcessingAllowed:false, dataSourceRestrictions:"Automated import requires separate written authorization.", notes:"Walmart affiliate terms prohibit price tracking and/or price-alert functionality relating to Walmart products; those capabilities remain disabled." },
    newegg:{ retailer:"Newegg", affiliateStatus:"pending", allowAffiliateLink:false, allowPriceComparison:false, allowPriceTracking:false, allowPriceHistory:false, allowPriceAlerts:false, allowAlertEmailPromotion:false, requiresNearLinkDisclosure:true, allowAutomatedDataImport:false, allowScraping:false, aiDataProcessingAllowed:false, dataSourceRestrictions:"Use only an approved Newegg or affiliate-network source.", notes:"Capabilities remain disabled until approved and authorized." },
    "b-and-h":{ retailer:"B&H", affiliateStatus:"pending", allowAffiliateLink:false, allowPriceComparison:false, allowPriceTracking:false, allowPriceHistory:false, allowPriceAlerts:false, allowAlertEmailPromotion:false, requiresNearLinkDisclosure:true, allowAutomatedDataImport:false, allowScraping:false, aiDataProcessingAllowed:false, dataSourceRestrictions:"Use only an approved B&H or affiliate-network source.", notes:"Capabilities remain disabled until approved and authorized." },
    "best-buy":{ retailer:"Best Buy", affiliateStatus:"blocked-pending-impact", allowAffiliateLink:false, allowPriceComparison:false, allowPriceTracking:false, allowPriceHistory:false, allowPriceAlerts:false, allowAlertEmailPromotion:false, requiresNearLinkDisclosure:true, allowAutomatedDataImport:false, allowScraping:false, aiDataProcessingAllowed:false, dataSourceRestrictions:"Use only an expressly approved source after impact review.", notes:"Affiliate use is blocked pending impact review." },
    "home-depot":{ retailer:"Home Depot", affiliateStatus:"declined", allowAffiliateLink:false, allowPriceComparison:false, allowPriceTracking:false, allowPriceHistory:false, allowPriceAlerts:false, allowAlertEmailPromotion:false, requiresNearLinkDisclosure:false, allowAutomatedDataImport:false, allowScraping:false, aiDataProcessingAllowed:false, dataSourceRestrictions:"No automated source is authorized by default.", notes:"Factual comparison would require a separate lawful, authorized data source." },
    target:{ retailer:"Target", affiliateStatus:"hold", allowAffiliateLink:false, allowPriceComparison:false, allowPriceTracking:false, allowPriceHistory:false, allowPriceAlerts:false, allowAlertEmailPromotion:false, requiresNearLinkDisclosure:true, allowAutomatedDataImport:false, allowScraping:false, aiDataProcessingAllowed:false, dataSourceRestrictions:"No automated source is authorized while on hold.", notes:"Comparison and monitoring require later authorization and review." },
    amazon:{ retailer:"Amazon", affiliateStatus:"hold", allowAffiliateLink:false, allowPriceComparison:false, allowPriceTracking:false, allowPriceHistory:false, allowPriceAlerts:false, allowAlertEmailPromotion:false, requiresNearLinkDisclosure:true, allowAutomatedDataImport:false, allowScraping:false, aiDataProcessingAllowed:false, dataSourceRestrictions:"No automated source is authorized until enrollment and program review.", notes:"Affiliate, comparison, monitoring, and alert capabilities remain disabled while on hold." },
    "tractor-supply":{ retailer:"Tractor Supply", affiliateStatus:"hold", allowAffiliateLink:false, allowPriceComparison:false, allowPriceTracking:false, allowPriceHistory:false, allowPriceAlerts:false, allowAlertEmailPromotion:false, requiresNearLinkDisclosure:true, allowAutomatedDataImport:false, allowScraping:false, aiDataProcessingAllowed:false, dataSourceRestrictions:"No automated source is authorized while on hold.", notes:"The current Partnerize hosting/domain requirement conflicts with the present free GitHub Pages setup." }
  };

  const aliases = Object.freeze({ "lowe's":"lowes", lowes:"lowes", "b&h":"b-and-h", bh:"b-and-h", "b-and-h":"b-and-h", bestbuy:"best-buy", "best-buy":"best-buy", homedepot:"home-depot", "home-depot":"home-depot", tractorsupply:"tractor-supply", "tractor-supply":"tractor-supply" });
  function normalizeRetailerId(value) { const normalized=String(value||"").trim().toLowerCase().replace(/[^a-z0-9&]+/g,"-").replace(/^-|-$/g,""); return aliases[normalized]||normalized; }
  function getCompliance(retailer) { const id=normalizeRetailerId(retailer&&typeof retailer==="object"?(retailer.retailerId||retailer.retailerName):retailer); return Object.freeze({ ...restrictiveDefault, ...(records[id]||{}), retailerId:id||null }); }
  function allows(retailer, capability) { return getCompliance(retailer)[capability] === true; }
  function eligibleOffers(product, capability) { return (product&&Array.isArray(product.offers)?product.offers:[]).filter(offer=>allows(offer,capability)); }
  return Object.freeze({ restrictiveDefault, retailers:Object.freeze(records), normalizeRetailerId, getCompliance, allows, eligibleOffers });
}));
