"use strict";
const compliance=require("../../retailer-compliance.js");

const text=value=>value===null||value===undefined?"":String(value).trim();
function price(value){ if(value===null||value===undefined||value==="")return null; const parsed=Number(value); return Number.isFinite(parsed)&&parsed>=0?parsed:null; }
function offerPrice(offer){ return price(offer&&offer.salePrice)??price(offer&&offer.price); }
function available(offer){ const status=text(offer&&offer.stockStatus).toLowerCase(); return !["out-of-stock","unavailable","discontinued"].includes(status)&&!/out of stock|unavailable|discontinued/i.test(text(offer&&offer.availability)); }
function variantCompatible(product,offer,variantId=null){
  const variants=Array.isArray(product&&product.variants)?product.variants:[];
  if(offer&&offer.variantId&&variants.length&&!variants.some(variant=>variant.variantId===offer.variantId))return false;
  if(variantId&&offer&&offer.variantId&&offer.variantId!==variantId)return false;
  return true;
}
function approved(offer,{mode="development",approvedRetailerIds=[]}={}){
  if(mode!=="production")return !/production-blocked/i.test(text(offer&&offer.dataStatus));
  return offer&&offer.dataStatus==="production-approved"&&approvedRetailerIds.includes(offer.retailerId);
}
function validOffer(product,offer,options={}){
  const current=offerPrice(offer);
  const capability=options.capability||null;
  return Boolean(offer&&text(offer.offerId)&&text(offer.retailerId)&&(!capability||compliance.allows(offer,capability))&&current!==null&&/^[A-Z]{3}$/.test(text(offer.currency))&&available(offer)&&variantCompatible(product,offer,options.variantId)&&approved(offer,options));
}
function validOffers(product,options={}){ return (product&&Array.isArray(product.offers)?product.offers:[]).filter(offer=>validOffer(product,offer,options)).filter(offer=>!options.currency||offer.currency===options.currency); }
function currentLowest(product,options={}){
  const offers=validOffers(product,options);
  const currencies=[...new Set(offers.map(offer=>offer.currency))];
  if(!options.currency&&currencies.length>1)return null;
  return offers.sort((a,b)=>offerPrice(a)-offerPrice(b))[0]||null;
}
function observation(product,offer,{timestamp=new Date().toISOString(),source="approved-catalog",sourceLastChecked=null}={}){
  if(!validOffer(product,offer,{mode:"development",capability:"allowPriceTracking"})||!compliance.allows(offer,"allowPriceHistory"))return null;
  return { productId:product.id,variantId:offer.variantId||null,retailerId:offer.retailerId,offerId:offer.offerId,price:offerPrice(offer),regularPrice:price(offer.regularPrice),currency:offer.currency,availability:offer.availability||offer.stockStatus||null,timestamp,source,sourceLastChecked:sourceLastChecked||offer.lastChecked||timestamp,dataStatus:offer.dataStatus||product.dataStatus||null };
}
module.exports={price,offerPrice,available,variantCompatible,approved,validOffer,validOffers,currentLowest,observation};
