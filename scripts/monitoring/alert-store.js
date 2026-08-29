"use strict";
const normalizeEmail=value=>String(value||"").trim().toLowerCase();
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
function normalizeAlert(input,now=new Date().toISOString()){
  const email=normalizeEmail(input.email||input.customerEmail); if(!validEmail(email))throw new Error("A valid customer email is required.");
  const target=Number(input.targetPrice); if(!Number.isFinite(target)||target<=0)throw new Error("A valid target price is required.");
  return {alertId:input.alertId||`alert-${Date.now()}`,productId:input.productId,variantId:input.variantId||null,email,targetPrice:Number(target.toFixed(2)),currency:input.currency||"USD",createdAt:input.createdAt||now,updatedAt:now,active:input.active!==false,status:input.active===false?"inactive":"active",currentLowestPrice:input.currentLowestPrice??null,lastCheckedAt:input.lastCheckedAt||null,triggeredAt:input.triggeredAt||null,lastNotificationAt:input.lastNotificationAt||null,notificationStatus:input.notificationStatus||"not-sent",lastNotificationKey:input.lastNotificationKey||null,dataStatus:input.dataStatus||"development-local"};
}
const duplicateKey=alert=>[normalizeEmail(alert.email),alert.productId,alert.variantId||"",alert.currency].join("|");
class MemoryAlertStore{
  constructor(records=[]){this.records=[];records.forEach(record=>this.upsert(record));}
  upsert(input){const record=normalizeAlert(input);const index=this.records.findIndex(item=>duplicateKey(item)===duplicateKey(record));if(index>=0){record.alertId=this.records[index].alertId;record.createdAt=this.records[index].createdAt;this.records[index]={...this.records[index],...record};return {record:this.records[index],created:false};}this.records.push(record);return {record,created:true};}
  listActive(){return this.records.filter(record=>record.active).map(record=>({...record}));}
  update(alertId,patch){const index=this.records.findIndex(record=>record.alertId===alertId);if(index<0)return null;this.records[index]={...this.records[index],...patch,updatedAt:new Date().toISOString()};return {...this.records[index]};}
}
module.exports={normalizeEmail,validEmail,normalizeAlert,duplicateKey,MemoryAlertStore};
