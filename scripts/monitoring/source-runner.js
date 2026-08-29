"use strict";
async function fetchSafely(adapter,context={}){
  const startedAt=new Date().toISOString();
  try{const result=await adapter.fetch(context);return{status:"available",startedAt,finishedAt:new Date().toISOString(),products:Array.isArray(result&&result.products)?result.products:[],errorCode:null};}
  catch(error){return{status:"source-outage",startedAt,finishedAt:new Date().toISOString(),products:[],errorCode:"SOURCE_UNAVAILABLE"};}
}
module.exports={fetchSafely};
