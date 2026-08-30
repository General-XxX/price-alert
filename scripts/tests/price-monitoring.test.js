"use strict";
const assert=require("node:assert/strict");const fs=require("node:fs");const path=require("node:path");
const root=path.resolve(__dirname,"..","..");const {fetchSafely}=require("../monitoring/source-runner.js");const {redact}=require("../monitoring/privacy.js");
const offers=require("../monitoring/offer-evaluator.js");const history=require("../monitoring/price-history.js");const {detect}=require("../monitoring/deal-detector.js");const {MemoryAlertStore,normalizeEmail}=require("../monitoring/alert-store.js");const destinations=require("../monitoring/destination-resolver.js");const {render}=require("../monitoring/email-template.js");const {MockEmailProvider,productionProvider}=require("../monitoring/email-provider.js");const {checkAlert}=require("../monitoring/alert-engine.js");
const variants=[{variantId:"kit",variantName:"Kit",modelNumber:"M-1",isDefaultVariant:true},{variantId:"tool",variantName:"Tool only",modelNumber:"M-1B"}];
const product={id:"p1",slug:"p1",brand:"Brand",name:"Product",modelNumber:"M-1",variants,offers:[
  {offerId:"a",retailerId:"ebay",retailerName:"eBay",variantId:"kit",price:80,regularPrice:120,currency:"USD",availability:"In Stock",stockStatus:"in-stock",affiliateUrl:"https://ebay.invalid/affiliate",affiliateTrackingStatus:"approved-production",productUrl:"https://ebay.invalid/product",dataStatus:"production-approved"},
  {offerId:"w",retailerId:"walmart",retailerName:"Walmart",variantId:"kit",price:80,currency:"USD",availability:"In Stock",stockStatus:"in-stock",productUrl:"https://walmart.invalid/product",dataStatus:"production-approved"},
  {offerId:"out",retailerId:"ebay",retailerName:"eBay",variantId:"kit",price:60,currency:"USD",availability:"Out of Stock",stockStatus:"out-of-stock",dataStatus:"production-approved"},
  {offerId:"wrong",retailerId:"lowes",retailerName:"Lowe's",variantId:"tool",price:50,currency:"USD",availability:"In Stock",dataStatus:"production-approved"},
  {offerId:"bad",retailerId:"target",retailerName:"Target",variantId:"kit",price:"not-price",currency:"USD",availability:"In Stock",dataStatus:"production-approved"},
  {offerId:"cad",retailerId:"amazon",retailerName:"Amazon",variantId:"kit",price:70,currency:"CAD",availability:"In Stock",dataStatus:"production-approved"}
]};

(async()=>{
  assert.equal(offers.currentLowest(product,{variantId:"kit",currency:"USD",mode:"development"}).offerId,"a","lowest compatible retailer wins deterministically");
  assert.equal(offers.currentLowest(product,{variantId:"kit",mode:"development"}),null,"currencies are never mixed implicitly");
  assert.equal(offers.validOffer(product,product.offers[2],{variantId:"kit"}),false,"unavailable offer ignored");
  assert.equal(offers.validOffer(product,product.offers[3],{variantId:"kit"}),false,"incompatible variant ignored");
  assert.equal(offers.validOffer(product,product.offers[4],{variantId:"kit"}),false,"malformed price ignored");
  assert.equal(offers.price(null),null,"missing price is not zero");

  const observed=offers.observation(product,product.offers[0],{timestamp:"2026-01-01T00:00:00Z"});let rows=[];
  let result=history.append(rows,observed);rows=result.history;assert.equal(result.added,true,"history observation created");
  result=history.append(rows,{...observed,timestamp:"2026-01-02T00:00:00Z"});assert.equal(result.added,false,"identical history deduplicated");
  result=history.append(rows,{...observed,price:75,timestamp:"2026-01-03T00:00:00Z"});rows=result.history;assert.equal(rows.length,2,"changed price preserved");
  assert.equal(history.lowestHistorical(rows,{productId:"p1",currency:"USD"}),75);assert.equal(history.currentLowest(rows,{productId:"p1",currency:"USD"}),75);assert.equal(history.change(rows,{productId:"p1",currency:"USD"}).amount,-5);assert.equal(history.trend(rows,{productId:"p1",currency:"USD"}),"down");
  assert.equal(history.append([],{...observed,dataStatus:"sample-development"},{mode:"production"}).reason,"non-production","sample history blocked from production");
  const outage=await fetchSafely({fetch:async()=>{throw new Error("private upstream detail");}});assert.equal(outage.status,"source-outage");assert.equal(outage.products.length,0);assert.equal(JSON.stringify(outage).includes("private upstream detail"),false,"outage reports do not leak provider errors");

  assert.deepEqual(detect({currentPrice:80,previousPrice:90,regularPrice:100,historicalLowest:85,targetPrice:80}),{valid:true,priceDrop:true,discount:{amount:20,percentage:20},newLowest:true,targetMatched:true});
  assert.equal(detect({currentPrice:80,targetPrice:79}).targetMatched,false,"above target does not match");assert.equal(detect({currentPrice:80,targetPrice:80}).targetMatched,true,"equal target matches");assert.equal(detect({currentPrice:80,targetPrice:81}).targetMatched,true,"below target matches");assert.equal(detect({currentPrice:80,regularPrice:null}).discount,null,"missing regular price cannot create discount");

  assert.equal(normalizeEmail(" Shopper@Example.com "),"shopper@example.com");const store=new MemoryAlertStore();
  const first=store.upsert({alertId:"alert-1",productId:"p1",variantId:"kit",email:"Shopper@Example.com",targetPrice:85,currency:"USD",dataStatus:"development-local"});
  const second=store.upsert({alertId:"alert-2",productId:"p1",variantId:"kit",email:"shopper@example.com",targetPrice:75,currency:"USD",dataStatus:"development-local"});
  assert.equal(first.created,true);assert.equal(second.created,false,"duplicate alert updates instead of multiplying");assert.equal(store.listActive().length,1);assert.equal(store.listActive()[0].targetPrice,75);

  assert.equal(destinations.resolve(product.offers[0],product).type,"affiliate");assert.equal(destinations.resolve({...product.offers[0],affiliateUrl:""},product).type,"product");assert.equal(destinations.resolve({...product.offers[0],affiliateUrl:"",productUrl:""},product).type,"retailer-search");
  assert.equal(destinations.resolve(product.offers[0],product,{context:"email"}).type,"product","affiliate email promotion is disabled without written approval");
  assert.equal(destinations.resolve({...product.offers[0],retailerId:"amazon",retailerName:"Amazon"},product).type,"product","hold retailer cannot use affiliate URL");
  const content=render({product,variant:variants[0],alert:{targetPrice:85,currency:"USD"},offer:{...product.offers[1],currentPrice:80},destination:destinations.resolve(product.offers[1],product),savings:null});assert.match(content.html,/PRICE ALERT/);assert.match(content.html,/View Deal/);assert.match(content.html,/Disclosure:<\/strong> Price Alert may earn a commission when you purchase through certain links on our site\. This does not increase the price you pay\./);assert.match(content.text,/\nDisclosure: Price Alert may earn a commission when you purchase through certain links on our site\. This does not increase the price you pay\./);assert.doesNotMatch(content.html,/shopper@example\.com/);
  const provider=new MockEmailProvider();const triggerStore=new MemoryAlertStore([{alertId:"trigger",productId:"p1",variantId:"kit",email:"private@example.com",targetPrice:80,currency:"USD",dataStatus:"development-local"}]);
  const triggered=await checkAlert({alert:triggerStore.listActive()[0],product,store:triggerStore,emailProvider:provider,mode:"development"});assert.equal(triggered.status,"mocked-not-sent");assert.equal(triggered.retailerId,"ebay","only an alert-permitted retailer can win");assert.equal(provider.deliveries.length,1);
  const repeated=await checkAlert({alert:triggerStore.listActive()[0],product,store:triggerStore,emailProvider:provider,mode:"development"});assert.equal(repeated.status,"already-notified","unchanged qualifying price does not spam");assert.equal(provider.deliveries.length,1);
  const productionBlocked=await checkAlert({alert:{...triggerStore.listActive()[0],dataStatus:"sample-development"},product,store:triggerStore,emailProvider:provider,mode:"production",approvedRetailerIds:["ebay"]});assert.equal(productionBlocked.status,"blocked-non-production-alert");assert.throws(()=>productionProvider(),/disabled/);
  const productBlocked=await checkAlert({alert:{...triggerStore.listActive()[0],dataStatus:"production-approved"},product:{...product,dataStatus:"sample-development"},store:triggerStore,emailProvider:provider,mode:"production",approvedRetailerIds:["ebay"]});assert.equal(productBlocked.status,"blocked-non-production-product");
  const redacted=redact({email:"private@example.com",message:"Contact private@example.com",apiKey:"do-not-print"});assert.equal(redacted.email,"[redacted]");assert.doesNotMatch(JSON.stringify(redacted),/private@example\.com|do-not-print/);

  const alertUi=fs.readFileSync(path.join(root,"price-alerts.js"),"utf8"),app=fs.readFileSync(path.join(root,"app.js"),"utf8"),page=fs.readFileSync(path.join(root,"products","index.html"),"utf8"),css=fs.readFileSync(path.join(root,"styles.css"),"utf8");
  assert.match(alertUi,/data-target-slider/);assert.match(alertUi,/5% lower[\s\S]*10% lower[\s\S]*20% lower/);assert.match(alertUi,/BrowserAlertStore/);assert.match(app,/priceAlertShoppingList/);assert.match(app,/search-form/);assert.match(app,/category-grid/);assert.match(page,/data-catalog-url/);assert.match(page,/id="target-price-alert"/);assert.match(css,/@media \(max-width:/);
  console.log("Price monitoring, history, deal, alert, privacy, and regression tests passed.");
})().catch(error=>{console.error(error);process.exitCode=1;});
