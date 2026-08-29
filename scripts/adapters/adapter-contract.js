"use strict";

function createRetailerAdapter({ adapterId, retailerId, displayName, requiredEnvironment = [] }) {
  if (!adapterId || !retailerId || !displayName) throw new Error("Retailer adapters require adapterId, retailerId, and displayName.");
  return Object.freeze({
    adapterId, retailerId, displayName, requiredEnvironment:Object.freeze([...requiredEnvironment]),
    configured(environment = process.env) { return requiredEnvironment.every(name => Boolean(environment[name])); },
    async fetch() {
      throw new Error(`${displayName} feed/API access is not configured. Use only an approved server-side feed implementation.`);
    },
    normalize(records, importer, options = {}) {
      const products=(Array.isArray(records)?records:[]).map(record=>({ ...record, offers:(record.offers||[]).map(offer=>({ ...offer, retailerId, retailerName:offer.retailerName||displayName })) }));
      return importer.importBatch(products, options);
    }
  });
}

module.exports = { createRetailerAdapter };
