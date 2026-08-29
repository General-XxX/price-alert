"use strict";
const { createRetailerAdapter } = require("./adapter-contract.js");
module.exports = createRetailerAdapter({ adapterId:"target", retailerId:"target", displayName:"Target", requiredEnvironment:["TARGET_FEED_CREDENTIAL"] });
