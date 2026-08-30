#!/usr/bin/env node
"use strict";
const fs=require("node:fs");const path=require("node:path");
const importer=require(path.resolve(__dirname,"..","catalog-importer.js"));
const evaluator=require("./monitoring/offer-evaluator.js");
const historyEngine=require("./monitoring/price-history.js");
const {MemoryAlertStore}=require("./monitoring/alert-store.js");
const {MockEmailProvider}=require("./monitoring/email-provider.js");
const {checkAll}=require("./monitoring/alert-engine.js");
const {detect}=require("./monitoring/deal-detector.js");
function argument(name,fallback){const index=process.argv.indexOf(name);return index>=0&&process.argv[index+1]?process.argv[index+1]:fallback;}
const root=path.resolve(__dirname,"..");const reportPath=path.resolve(root,argument("--report","artifacts/price-monitor-development-report.json"));
global.window={PriceAlertImporter:importer};require(path.resolve(root,"products.js"));const products=global.window.PriceAlertData.products;
let history=[];let observations=0;let duplicates=0;const deals={priceDrops:0,discounts:0,newLows:0};
for(const product of products){for(const offer of evaluator.validOffers(product,{mode:"development",capability:"allowPriceTracking"})){const entry=evaluator.observation(product,offer,{source:"development-catalog"});if(!entry)continue;const priorPrices=(product.priceHistory||[]).filter(item=>require("../retailer-compliance.js").allows(item.retailerId,"allowPriceHistory")).map(item=>Number(item.price)).filter(Number.isFinite);const detected=detect({currentPrice:entry.price,previousPrice:priorPrices.at(-1)??null,regularPrice:entry.regularPrice,historicalLowest:priorPrices.length?Math.min(...priorPrices):null});if(detected.priceDrop)deals.priceDrops+=1;if(detected.discount)deals.discounts+=1;if(detected.newLowest)deals.newLows+=1;const result=historyEngine.append(history,entry,{mode:"development"});history=result.history;if(result.added)observations+=1;else if(result.reason==="duplicate")duplicates+=1;}}
const first=products.find(product=>evaluator.currentLowest(product,{currency:"USD",mode:"development",capability:"allowPriceAlerts"}));const winner=first&&evaluator.currentLowest(first,{currency:"USD",mode:"development",capability:"allowPriceAlerts"});
const store=new MemoryAlertStore([{alertId:"development-monitor-alert",productId:first.id,variantId:(first.variants[0]||{}).variantId||null,email:"development-alert@example.invalid",targetPrice:evaluator.offerPrice(winner),currency:"USD",dataStatus:"development-local"}]);
const provider=new MockEmailProvider();
(async()=>{const results=await checkAll({store,products,emailProvider:provider,mode:"development"});const statuses=results.reduce((counts,result)=>(counts[result.status]=(counts[result.status]||0)+1,counts),{});const report={runAt:new Date().toISOString(),mode:"development-safe",productionDataModified:false,realEmailsSent:0,customerDataIncluded:false,productsChecked:products.length,offersObserved:observations,duplicateObservations:duplicates,historyRecords:history.length,dealsDetected:deals,alertsChecked:results.length,notificationStatuses:statuses,mockDeliveries:provider.deliveries.length};fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,`${JSON.stringify(report,null,2)}\n`,"utf8");console.log(JSON.stringify(report,null,2));})().catch(error=>{console.error("Price monitoring failed without publishing or sending email.");process.exitCode=1;});
