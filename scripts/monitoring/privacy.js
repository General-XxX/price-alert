"use strict";
const EMAIL=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const SECRET_KEYS=/token|secret|password|api[-_]?key|authorization|customerEmail|email/i;
function redact(value){
  if(typeof value==="string")return value.replace(EMAIL,"[redacted-email]");
  if(Array.isArray(value))return value.map(redact);
  if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,SECRET_KEYS.test(key)?"[redacted]":redact(item)]));
  return value;
}
module.exports={redact};
