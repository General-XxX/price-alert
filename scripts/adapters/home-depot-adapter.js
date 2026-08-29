"use strict";
const { createRetailerAdapter } = require("./adapter-contract.js");
module.exports = createRetailerAdapter({ adapterId:"home-depot", retailerId:"home-depot", displayName:"Home Depot", requiredEnvironment:["HOME_DEPOT_FEED_CREDENTIAL"] });
