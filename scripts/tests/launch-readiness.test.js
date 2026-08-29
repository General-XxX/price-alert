"use strict";
const assert=require("node:assert/strict");const fs=require("node:fs");const path=require("node:path");const vm=require("node:vm");
const root=path.resolve(__dirname,"..","..");const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const html=read("index.html"),productPage=read("products/index.html"),app=read("app.js"),detail=read("products/dewalt-dcd771c2/product-page.js"),alerts=read("price-alerts.js"),links=read("retailer-links.js"),styles=read("styles.css"),robots=read("robots.txt"),sitemap=read("sitemap.xml");

assert.doesNotMatch(html+productPage,/development preview|test data|\bdemo\b|coming soon|under construction/i,"public HTML contains no unfinished-site language");
assert.doesNotMatch(app+alerts,/console\.assert|runDevelopment/i,"browser bundles do not execute embedded development tests");
assert.match(alerts,/saved privately on this device/);assert.match(alerts,/No email was sent/);assert.match(alerts,/email delivery is not currently active/);
assert.match(app,/stored only in this browser/);assert.match(app,/does not sell, stock, or ship/);assert.match(html,/Price Alert may earn a commission[\s\S]*does not increase the price you pay/);
assert.match(html,/rel="canonical" href="https:\/\/general-xxx\.github\.io\/price-alert\/"/);assert.match(html,/name="robots" content="index, follow/);assert.match(html,/property="og:image"/);assert.match(html,/application\/ld\+json/);assert.match(robots,/Allow: \/price-alert\//);assert.match(robots,/sitemap\.xml/i);assert.equal(fs.existsSync(path.join(root,"google22d28997ac56c79f.html")),true);
assert.match(productPage,/name="robots" content="noindex, follow"/,"reusable route defaults to noindex until an approved product loads");
assert.doesNotMatch(sitemap,/products\/index\.html/,"development products are absent from the public sitemap");
const {generate}=require("../generate-sitemap.js");const generated=generate([{slug:"sample",dataStatus:"sample-development"},{slug:"approved-product",dataStatus:"production-approved"}]);assert.doesNotMatch(generated,/slug=sample/);assert.match(generated,/slug=approved-product/);

const context={window:{},URL};context.window.window=context.window;vm.runInNewContext(links,context);
for(const retailerId of ["ebay","walmart","lowes","home-depot","target","amazon","best-buy"]){const result=context.window.PriceAlertRetailerLinks.resolveOfferDestination({retailerId,retailerName:retailerId,affiliateUrl:"",productUrl:"#"},{brand:"Brand",modelNumber:"M1",name:"Product"});assert.ok(result&&/^https?:/.test(result.url)&&result.url!=="#",`${retailerId} has a safe fallback`);}
assert.match(app,/target="_blank" rel="noopener noreferrer sponsored"/);assert.match(detail,/target="_blank" rel="noopener noreferrer sponsored"/);
assert.match(detail,/Product not found/);assert.match(detail,/noindex, follow/);assert.match(detail,/No valid retailer offers/);assert.match(app,/No valid retailer offers/);assert.match(app,/Price unavailable/);assert.match(app,/could not save your Shopping List/);
assert.match(html,/aria-controls="filters" aria-expanded="false"/);assert.match(styles,/:focus-visible/);assert.match(styles,/@media \(max-width:/);assert.match(html,/label class="sr-only" for="search-input"/);assert.match(productPage,/aria-label="Breadcrumb"/);
assert.match(html,/price-alerts\.js\?v=20260829-4/);assert.match(html,/app\.js\?v=20260829-8/);assert.match(productPage,/product-page\.js\?v=20260829-5/);
assert.match(html,/catalog-importer\.js\?v=20260829-3/);
assert.match(html,/catalog-loader\.js\?v=20260829-2/);
assert.doesNotMatch(html+productPage+app+detail+alerts,/AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{20,}|SG\.[A-Za-z0-9_-]{20,}/,"no credential-shaped values in public assets");
assert.equal(fs.existsSync(path.join(root,"package.json")),false,"launch does not require paid or build-time dependencies");
console.log("Launch readiness, public copy, SEO, links, accessibility, and safety tests passed.");
