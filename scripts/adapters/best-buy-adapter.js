"use strict";
const {createRetailerAdapter}=require("./adapter-contract.js");
module.exports=createRetailerAdapter({adapterId:"best-buy",retailerId:"best-buy",displayName:"Best Buy",requiredEnvironment:["BEST_BUY_FEED_CREDENTIAL"]});
