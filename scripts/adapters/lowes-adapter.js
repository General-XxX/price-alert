"use strict";
const { createRetailerAdapter } = require("./adapter-contract.js");
module.exports = createRetailerAdapter({ adapterId:"lowes", retailerId:"lowes", displayName:"Lowe's", requiredEnvironment:["LOWES_FEED_CREDENTIAL"] });
