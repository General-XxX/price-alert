"use strict";
const assert=require("node:assert/strict");const fs=require("node:fs");const path=require("node:path");const vm=require("node:vm");
const root=path.resolve(__dirname,"..","..");const compliance=require(path.join(root,"retailer-compliance.js"));const evaluator=require("../monitoring/offer-evaluator.js");const history=require("../monitoring/price-history.js");const destinations=require("../monitoring/destination-resolver.js");

const unknown=compliance.getCompliance("new-retailer");
for(const capability of ["allowAffiliateLink","allowPriceComparison","allowPriceTracking","allowPriceHistory","allowPriceAlerts","allowAlertEmailPromotion","allowAutomatedDataImport","allowScraping","aiDataProcessingAllowed"])assert.equal(unknown[capability],false,`unknown retailer denies ${capability}`);
const walmart=compliance.getCompliance("walmart");assert.equal(walmart.allowPriceTracking,false);assert.equal(walmart.allowPriceHistory,false);assert.equal(walmart.allowPriceAlerts,false);assert.match(walmart.notes,/prohibit price tracking/i);

const baseProduct={id:"p",brand:"Brand",name:"Product",modelNumber:"M1",variants:[],offers:[]};
const walmartOffer={offerId:"w",retailerId:"walmart",retailerName:"Walmart",price:10,currency:"USD",availability:"In Stock",dataStatus:"production-approved",affiliateUrl:"https://walmart.invalid/affiliate",productUrl:"https://walmart.invalid/product",affiliateTrackingStatus:"approved-production"};
baseProduct.offers=[walmartOffer];
assert.equal(evaluator.validOffers(baseProduct,{capability:"allowPriceTracking"}).length,0,"Walmart cannot enter price tracking");
assert.equal(evaluator.currentLowest(baseProduct,{capability:"allowPriceAlerts",currency:"USD"}),null,"Walmart cannot enter price alerts");
assert.equal(evaluator.observation(baseProduct,walmartOffer),null,"Walmart cannot create an observation");
assert.equal(history.append([],{productId:"p",retailerId:"walmart",offerId:"w",price:10,currency:"USD"}).reason,"retailer-disallowed","Walmart cannot create history");

for(const retailerId of ["lowes","walmart","newegg","b-and-h","best-buy","home-depot","target","amazon","tractor-supply"]){const result=destinations.resolve({...walmartOffer,retailerId,retailerName:retailerId},baseProduct);assert.notEqual(result&&result.type,"affiliate",`${retailerId} cannot use an affiliate URL`);}
const ebayOffer={...walmartOffer,retailerId:"ebay",retailerName:"eBay",affiliateUrl:"https://ebay.invalid/approved",productUrl:"https://ebay.invalid/product"};
assert.equal(destinations.resolve(ebayOffer,baseProduct).type,"affiliate","approved active eBay affiliate URL is permitted");
assert.equal(destinations.resolve(ebayOffer,baseProduct,{context:"email"}).type,"product","eBay affiliate email promotion remains disabled");

const browserContext={window:{},URL};browserContext.window.window=browserContext.window;
vm.runInNewContext(fs.readFileSync(path.join(root,"retailer-compliance.js"),"utf8"),browserContext);vm.runInNewContext(fs.readFileSync(path.join(root,"retailer-links.js"),"utf8"),browserContext);
const affiliate=browserContext.window.PriceAlertRetailerLinks.resolveOfferDestination(ebayOffer,baseProduct);const direct=browserContext.window.PriceAlertRetailerLinks.resolveOfferDestination(walmartOffer,baseProduct);
assert.equal(affiliate.requiresNearLinkDisclosure,true);assert.equal(affiliate.sponsored,true);assert.equal(direct.requiresNearLinkDisclosure,false);assert.equal(direct.sponsored,false);
const alertContext={window:{PriceAlertRetailerCompliance:browserContext.window.PriceAlertRetailerCompliance},localStorage:{getItem:()=>"[]",setItem:()=>{}},Intl,Date,console};alertContext.window.window=alertContext.window;
vm.runInNewContext(fs.readFileSync(path.join(root,"price-alerts.js"),"utf8"),alertContext);
assert.match(alertContext.window.PriceAlertStorage.renderTargetAlert(baseProduct,10,"USD"),/not available for this product right now/);
assert.match(alertContext.window.PriceAlertStorage.renderTargetAlert({...baseProduct,offers:[ebayOffer]},10,"USD"),/data-target-slider/);
assert.equal(alertContext.window.PriceAlertStorage.createAlertRecord({productId:"p",targetPrice:9,email:"shopper@example.com",currency:"USD",currentLowestPrice:10,eligibleRetailerIds:[]}).ok,false);
const app=fs.readFileSync(path.join(root,"app.js"),"utf8"),detail=fs.readFileSync(path.join(root,"products","dewalt-dcd771c2","product-page.js"),"utf8");
for(const renderer of [app,detail]){assert.match(renderer,/destination\.requiresNearLinkDisclosure/);assert.match(renderer,/Price Alert may earn a commission from this retailer\./);assert.match(renderer,/destination\.sponsored/);}
console.log("Retailer compliance, fail-closed, alert/history, affiliate, and near-link disclosure tests passed.");
