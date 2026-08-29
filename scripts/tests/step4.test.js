"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname,"..","..");
const importer = require(path.join(root,"catalog-importer.js"));
const updater = require(path.join(root,"scripts","catalog-update-core.js"));
const adapters = require(path.join(root,"scripts","adapters","adapter-registry.js"));

(async () => {
  const fixture=JSON.parse(fs.readFileSync(path.join(root,"fixtures","sample-product-batch.json"),"utf8"));
  const imported=importer.importBatch(fixture,{dataStatus:"sample-development"});
  assert.equal(imported.errors.length,0,"batch fixture imports without errors");
  assert.equal(imported.products.length,fixture.length,"all batch records import");

  const first=updater.updateCatalog([],imported.products);
  const second=updater.updateCatalog(first.products,imported.products);
  assert.equal(second.report.added,0,"second update is idempotent");
  assert.equal(second.report.updated,0,"second update does not rewrite products");
  const base={ id:"variant-a",name:"Drill",brand:"Brand",modelNumber:"M1",identity:{brand:"Brand",modelNumber:"M1",upc:"123"},specifications:{toolOnly:false},variants:[],offers:[] };
  const conflict={ ...base,id:"variant-b",specifications:{toolOnly:true} };
  assert.equal(updater.compareVariantCompatibility(base,conflict).compatible,false,"variant conflicts are rejected");

  const adapterList=adapters.list();
  ["generic-file","generic-json","generic-csv","ebay","walmart","lowes","home-depot","target","amazon"].forEach(id=>assert.ok(adapterList.some(adapter=>adapter.adapterId===id),`${id} adapter is registered`));
  assert.equal(adapters.get("ebay").configured({}),false,"credentialed adapters stay disabled without environment credentials");

  const fallback={ products:[{id:"fallback",slug:"fallback",dataStatus:"sample-development",offers:[]}],categories:[],retailers:[] };
  const production={ id:"production",slug:"production",name:"Production Product",brand:"Brand",category:"Tools",dataStatus:"production-approved",sourceMetadata:{source:"approved-feed"},media:{primaryImage:"",galleryImages:[]},offers:[] };
  const loaderContext={ window:{ PriceAlertData:fallback,location:{protocol:"https:"} },document:{currentScript:{dataset:{catalogUrl:"data/catalog.generated.json"}}},fetch:async()=>({ok:true,json:async()=>({products:[production]})}),URL,console };
  loaderContext.window.window=loaderContext.window;
  vm.runInNewContext(fs.readFileSync(path.join(root,"catalog-loader.js"),"utf8"),loaderContext);
  const loaded=await loaderContext.window.PriceAlertCatalogReady;
  assert.equal(loaded.catalogSource,"generated-production","approved generated catalog loads");
  assert.equal(loaderContext.window.PriceAlertCatalogLoader.productionProductIsSafe({...production,dataStatus:"sample-development"}),false,"sample products cannot leak into production");
  assert.equal(loaderContext.window.PriceAlertCatalogLoader.productionProductIsSafe({...production,media:{primaryImage:"https://images.invalid/p.jpg",galleryImages:[],imageSource:"",imageLicenseOrPermission:""}}),false,"unverified images are rejected");

  const linksContext={window:{},URL}; linksContext.window.window=linksContext.window;
  vm.runInNewContext(fs.readFileSync(path.join(root,"retailer-links.js"),"utf8"),linksContext);
  const destination=linksContext.window.PriceAlertRetailerLinks.resolveOfferDestination({retailerId:"target",retailerName:"Target",affiliateUrl:"",productUrl:""},{brand:"Brand",modelNumber:"M1",name:"Product"});
  assert.equal(destination.linkType,"retailer-search","missing direct retailer links use search fallback");
  assert.match(destination.url,/target\.com/);

  const app=fs.readFileSync(path.join(root,"app.js"),"utf8");
  const page=fs.readFileSync(path.join(root,"products","index.html"),"utf8");
  const detail=fs.readFileSync(path.join(root,"products","dewalt-dcd771c2","product-page.js"),"utf8");
  const alerts=fs.readFileSync(path.join(root,"price-alerts.js"),"utf8");
  assert.match(app,/products\/index\.html\?slug=/,"all cards use reusable slug routing");
  assert.match(app,/category-grid[\s\S]*data-category/,"category browsing remains connected");
  assert.match(app,/search-form[\s\S]*renderResults/,"search remains connected");
  assert.match(app,/priceAlertShoppingList/,"shopping list persistence remains connected");
  assert.match(page,/id="target-price-alert"/,"reusable page has the shared alert mount");
  assert.match(alerts,/data-target-slider/,"shared alert includes target slider");
  assert.match(alerts,/5% lower[\s\S]*10% lower[\s\S]*20% lower/,"shared alert includes quick targets");
  assert.match(detail,/priceHistory/,"reusable page renders price history");
  assert.match(detail,/resolveOfferDestination/,"reusable page uses retailer destination resolver");
  assert.match(detail,/authorizedImage/,"reusable page gates image rendering");

  console.log("Step 4 pipeline and public integration tests passed.");
})().catch(error=>{ console.error(error); process.exitCode=1; });
