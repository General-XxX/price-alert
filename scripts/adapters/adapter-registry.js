"use strict";
const adapters = ["generic-feed","generic-json","generic-csv","ebay","walmart","lowes","home-depot","target","amazon"].map(name=>require(`./${name}-adapter.js`));
const registry = new Map(adapters.map(adapter=>[adapter.adapterId,adapter]));
function get(adapterId) { const adapter=registry.get(adapterId); if(!adapter) throw new Error(`Unknown retailer adapter '${adapterId}'.`); return adapter; }
function list() { return adapters.map(adapter=>({ adapterId:adapter.adapterId, retailerId:adapter.retailerId, displayName:adapter.displayName, requiredEnvironment:[...adapter.requiredEnvironment], configured:adapter.configured() })); }
module.exports = { get, list };
