"use strict";
const { createRetailerAdapter } = require("./adapter-contract.js");
function normalizeRecord(record,options={}){const approved=options.sourceApproved===true&&options.sourceType==="retailer-api";return{...record,primaryImage:record.primaryImage||(record.image&&record.image.imageUrl),galleryImages:record.galleryImages||(record.additionalImages||[]).map(image=>image&&image.imageUrl).filter(Boolean),imageSourceType:approved?"retailer-api":"unverified",imageSource:approved?(options.sourceId||"ebay-browse-api"):null,sourceApproved:approved,imageLicenseOrPermission:approved?"authorized-retailer-api":null};}
module.exports = createRetailerAdapter({ adapterId:"ebay", retailerId:"ebay", displayName:"eBay", requiredEnvironment:["EBAY_CLIENT_ID","EBAY_CLIENT_SECRET"],normalizeRecord });
