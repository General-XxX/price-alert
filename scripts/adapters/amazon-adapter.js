"use strict";
const { createRetailerAdapter } = require("./adapter-contract.js");
module.exports = createRetailerAdapter({ adapterId:"amazon", retailerId:"amazon", displayName:"Amazon", requiredEnvironment:["AMAZON_ACCESS_KEY","AMAZON_SECRET_KEY","AMAZON_PARTNER_TAG"] });
