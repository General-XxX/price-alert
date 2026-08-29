"use strict";
const { createRetailerAdapter } = require("./adapter-contract.js");
module.exports = createRetailerAdapter({ adapterId:"ebay", retailerId:"ebay", displayName:"eBay", requiredEnvironment:["EBAY_CLIENT_ID","EBAY_CLIENT_SECRET"] });
