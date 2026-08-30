"use strict";
const escape=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
const money=(value,currency)=>new Intl.NumberFormat("en-US",{style:"currency",currency}).format(value);
function render({product,variant,alert,offer,destination,savings=null}){
  if(!product||!alert||!offer||!destination)throw new Error("Email content requires a product, alert, qualifying offer, and destination.");
  const variantText=variant?[variant.variantName,variant.modelNumber].filter(Boolean).join(" · "):(product.modelNumber?`Model ${product.modelNumber}`:"");
  const subject=`Price Alert: ${product.name} reached ${money(offer.currentPrice,alert.currency)}`;
  const html=`<!doctype html><html><body style="font-family:Arial,sans-serif;color:#17233c"><h1 style="color:#0866d9">PRICE ALERT</h1><h2>${escape(product.brand)} ${escape(product.name)}</h2>${variantText?`<p>${escape(variantText)}</p>`:""}<p>Your target: <strong>${money(alert.targetPrice,alert.currency)}</strong></p><p>Current qualifying price: <strong>${money(offer.currentPrice,alert.currency)}</strong> at ${escape(offer.retailerName)}</p>${savings!==null&&savings>0?`<p>Factual savings: ${money(savings,alert.currency)}</p>`:""}<p><a href="${escape(destination.url)}" style="background:#0866d9;color:white;padding:12px 18px;text-decoration:none">View Deal</a></p><p><strong>Disclosure:</strong> Price Alert may earn a commission when you purchase through certain links on our site. This does not increase the price you pay.</p><p><a href="{{alert-management-url}}">Manage or unsubscribe from this alert</a></p></body></html>`;
  const text=`PRICE ALERT\n${product.brand} ${product.name}\n${variantText}\nTarget: ${money(alert.targetPrice,alert.currency)}\nCurrent: ${money(offer.currentPrice,alert.currency)} at ${offer.retailerName}\nView Deal: ${destination.url}\nDisclosure: Price Alert may earn a commission when you purchase through certain links on our site. This does not increase the price you pay.\nManage alert: {{alert-management-url}}`;
  return {subject,html,text};
}
module.exports={render};
