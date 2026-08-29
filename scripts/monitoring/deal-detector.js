"use strict";
const { price }=require("./offer-evaluator.js");
function detect({currentPrice,previousPrice=null,regularPrice=null,historicalLowest=null,targetPrice=null}){
  const current=price(currentPrice),previous=price(previousPrice),regular=price(regularPrice),historical=price(historicalLowest),target=price(targetPrice);
  if(current===null)return {valid:false,priceDrop:false,discount:null,newLowest:false,targetMatched:false};
  const priceDrop=previous!==null&&current<previous;
  const discount=regular!==null&&regular>current?{amount:Number((regular-current).toFixed(2)),percentage:Number(((regular-current)/regular*100).toFixed(2))}:null;
  return {valid:true,priceDrop,discount,newLowest:historical!==null&&current<historical,targetMatched:target!==null&&current<=target};
}
module.exports={detect};
