"use strict";
const { price }=require("./offer-evaluator.js");
const key=entry=>[entry.productId,entry.variantId||"",entry.retailerId,entry.offerId,entry.currency].join("|");
function sameObservation(a,b){ return key(a)===key(b)&&a.price===b.price&&a.regularPrice===b.regularPrice&&a.availability===b.availability; }
function append(history,incoming,{mode="development"}={}){
  const output=Array.isArray(history)?history.map(item=>({...item})):[];
  if(!incoming||price(incoming.price)===null)return {history:output,added:false,reason:"invalid"};
  if(mode==="production"&&incoming.dataStatus!=="production-approved")return {history:output,added:false,reason:"non-production"};
  const latest=[...output].reverse().find(item=>key(item)===key(incoming));
  if(latest&&sameObservation(latest,incoming))return {history:output,added:false,reason:"duplicate"};
  output.push({...incoming}); return {history:output,added:true,reason:"added"};
}
function matching(history,{productId,variantId=null,currency,retailerId=null}={}){ return (history||[]).filter(item=>item.productId===productId&&(variantId===null||item.variantId===variantId)&&(!currency||item.currency===currency)&&(!retailerId||item.retailerId===retailerId)&&price(item.price)!==null); }
function lowestHistorical(history,query){ const rows=matching(history,query); return rows.length?Math.min(...rows.map(item=>item.price)):null; }
function currentLowest(history,query){ const rows=matching(history,query); const latestByOffer=new Map(); rows.forEach(item=>{const k=key(item);if(!latestByOffer.has(k)||new Date(item.timestamp)>=new Date(latestByOffer.get(k).timestamp))latestByOffer.set(k,item);}); const current=[...latestByOffer.values()]; return current.length?Math.min(...current.map(item=>item.price)):null; }
function change(history,query){ const rows=matching(history,query).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp)); if(rows.length<2)return {amount:null,percentage:null}; const before=rows[rows.length-2].price,current=rows[rows.length-1].price; return {amount:Number((current-before).toFixed(2)),percentage:before>0?Number(((current-before)/before*100).toFixed(2)):null}; }
function trend(history,query){ const amount=change(history,query).amount; return amount===null?"insufficient-data":amount<0?"down":amount>0?"up":"steady"; }
class MemoryPriceHistoryStore{
  constructor(records=[]){this.records=records.map(record=>({...record}));}
  record(observation,options){const result=append(this.records,observation,options);this.records=result.history;return result;}
  query(criteria){return matching(this.records,criteria).map(record=>({...record}));}
}
module.exports={append,matching,lowestHistorical,currentLowest,change,trend,sameObservation,MemoryPriceHistoryStore};
