"use strict";
const {createRetailerAdapter}=require("./adapter-contract.js");
module.exports=createRetailerAdapter({adapterId:"tractor-supply",retailerId:"tractor-supply",displayName:"Tractor Supply",requiredEnvironment:["TRACTOR_SUPPLY_FEED_CREDENTIAL"]});
