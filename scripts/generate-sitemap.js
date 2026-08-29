#!/usr/bin/env node
"use strict";
const fs=require("node:fs");const path=require("node:path");
const root=path.resolve(__dirname,"..");
function argument(name,fallback){const index=process.argv.indexOf(name);return index>=0&&process.argv[index+1]?process.argv[index+1]:fallback;}
const catalogPath=path.resolve(root,argument("--catalog","data/catalog.generated.json"));const outputPath=path.resolve(root,argument("--output","artifacts/sitemap.generated.xml"));
function escapeXml(value){return String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");}
function generate(products){
  const approved=(products||[]).filter(product=>product&&product.dataStatus==="production-approved"&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug||""));
  const urls=["https://general-xxx.github.io/price-alert/",...approved.map(product=>`https://general-xxx.github.io/price-alert/products/index.html?slug=${encodeURIComponent(product.slug)}`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url=>`  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`).join("\n")}\n</urlset>\n`;
}
if(require.main===module){if(!fs.existsSync(catalogPath))throw new Error("A validated generated catalog is required.");const catalog=JSON.parse(fs.readFileSync(catalogPath,"utf8"));const xml=generate(catalog.products);fs.mkdirSync(path.dirname(outputPath),{recursive:true});fs.writeFileSync(outputPath,xml,"utf8");console.log(`Generated sitemap candidate with ${(catalog.products||[]).filter(product=>product.dataStatus==="production-approved").length} approved product URLs.`);}
module.exports={escapeXml,generate};
