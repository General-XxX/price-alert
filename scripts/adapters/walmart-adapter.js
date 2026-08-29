"use strict";
const { createRetailerAdapter } = require("./adapter-contract.js");
module.exports = createRetailerAdapter({ adapterId:"walmart", retailerId:"walmart", displayName:"Walmart", requiredEnvironment:["WALMART_CLIENT_ID","WALMART_CLIENT_SECRET"] });
