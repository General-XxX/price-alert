"use strict";
const {currentLowest,offerPrice}=require("./offer-evaluator.js");
const {resolve}=require("./destination-resolver.js");
const {render}=require("./email-template.js");
function notificationKey(offer){return [offer.offerId,offer.currency,offerPrice(offer)].join("|");}
async function checkAlert({alert,product,store,emailProvider,mode="development",approvedRetailerIds=[]}){
  if(!alert.active)return{status:"inactive"};
  if(mode==="production"&&alert.dataStatus!=="production-approved")return{status:"blocked-non-production-alert"};
  if(mode==="production"&&product.dataStatus!=="production-approved")return{status:"blocked-non-production-product"};
  const winner=currentLowest(product,{variantId:alert.variantId,currency:alert.currency,mode,approvedRetailerIds,capability:"allowPriceAlerts"});
  const checkedAt=new Date().toISOString();
  if(!winner){store.update(alert.alertId,{lastCheckedAt:checkedAt,notificationStatus:"no-valid-price"});return{status:"no-valid-price"};}
  const current=offerPrice(winner);store.update(alert.alertId,{currentLowestPrice:current,lastCheckedAt:checkedAt});
  if(current>alert.targetPrice)return{status:"target-not-reached",currentPrice:current};
  const key=notificationKey(winner);if(alert.lastNotificationKey===key)return{status:"already-notified",currentPrice:current};
  const destination=resolve(winner,product,{mode,context:"email"});if(!destination){store.update(alert.alertId,{notificationStatus:"no-destination"});return{status:"no-destination"};}
  const regular=Number(winner.regularPrice);const savings=Number.isFinite(regular)&&regular>current?Number((regular-current).toFixed(2)):null;
  const variant=(product.variants||[]).find(item=>item.variantId===alert.variantId)||null;
  const content=render({product,variant,alert,offer:{...winner,currentPrice:current},destination,savings});
  const receipt=await emailProvider.send({to:alert.email,...content});
  store.update(alert.alertId,{triggeredAt:alert.triggeredAt||checkedAt,lastNotificationAt:checkedAt,lastNotificationKey:key,notificationStatus:receipt.status});
  return{status:receipt.status,retailerId:winner.retailerId,offerId:winner.offerId,currentPrice:current,targetPrice:alert.targetPrice,savings,destinationType:destination.type};
}
async function checkAll({store,products,emailProvider,mode="development",approvedRetailerIds=[]}){const results=[];for(const alert of store.listActive()){const product=products.find(item=>item.id===alert.productId);results.push(product?await checkAlert({alert,product,store,emailProvider,mode,approvedRetailerIds}):{status:"product-not-found"});}return results;}
module.exports={notificationKey,checkAlert,checkAll};
