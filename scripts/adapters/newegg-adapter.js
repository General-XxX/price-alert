"use strict";
const {createRetailerAdapter}=require("./adapter-contract.js");
module.exports=createRetailerAdapter({adapterId:"newegg",retailerId:"newegg",displayName:"Newegg",requiredEnvironment:["NEWEGG_FEED_CREDENTIAL"]});
