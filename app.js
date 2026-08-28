// Sample-only catalog. Replace this module with retailer/API data when backend services are ready.
const offer = (retailer, price, availability, fulfillment) => ({ retailer, price, availability, fulfillment, url: "#" });

const products = [
  { id:"dewalt-drill", name:"20V MAX Cordless Drill Kit", brand:"DeWalt", model:"DCD771C2", item:"1000050241", upc:"885911325905", category:"Tools", mark:"DW", description:"Compact drill/driver kit with two batteries, charger, and carrying bag.", originalPrice:129, offers:[offer("Home Depot",99,"In Stock","Free store pickup"),offer("Amazon",104.95,"In Stock","Free shipping"),offer("Lowe's",109,"Limited Stock","Pickup available")], history:[119,115,109,105,109,99] },
  { id:"milwaukee-impact", name:"M18 Brushless Impact Driver Kit", brand:"Milwaukee", model:"3650-21P", item:"1001931268", upc:"045242637331", category:"Tools", mark:"MW", description:"Brushless impact driver kit built for compact power and everyday fastening.", originalPrice:179, offers:[offer("Home Depot",149,"In Stock","Free store pickup"),offer("eBay",154.99,"In Stock","Standard shipping"),offer("Amazon",159,"In Stock","Free shipping")], history:[179,169,165,159,149,149] },
  { id:"airpods-pro", name:"AirPods Pro (2nd Generation)", brand:"Apple", model:"MTJV3AM/A", item:"6530591", upc:"194253397168", category:"Electronics", mark:"AP", description:"Wireless earbuds with active noise cancellation and USB-C charging case.", originalPrice:249, offers:[offer("Best Buy",189.99,"In Stock","Pickup today"),offer("Walmart",194,"In Stock","Free shipping"),offer("Amazon",199,"In Stock","Free shipping")], history:[229,219,209,199,189.99,189.99] },
  { id:"sony-headphones", name:"WH-1000XM5 Wireless Headphones", brand:"Sony", model:"WH1000XM5/B", item:"6505727", upc:"027242923775", category:"Electronics", mark:"SO", description:"Over-ear wireless headphones with adaptive noise cancellation.", originalPrice:399.99, offers:[offer("Best Buy",349.99,"In Stock","Pickup available"),offer("Amazon",348,"In Stock","Free shipping"),offer("Walmart",359,"Online Only","Free shipping")], history:[399,389,379,349,359,348] },
  { id:"nest-thermostat", name:"Learning Thermostat, 4th Gen", brand:"Google Nest", model:"GA05551-US", item:"1010159371", upc:"193575037053", category:"Home Improvement", mark:"NE", description:"Smart thermostat with an adaptive display and energy-saving schedules.", originalPrice:279.99, offers:[offer("Lowe's",259,"In Stock","Pickup available"),offer("Home Depot",264,"In Stock","Free store pickup"),offer("Best Buy",279.99,"In Stock","Free shipping")], history:[279,279,269,264,259,259] },
  { id:"ring-doorbell", name:"Battery Doorbell Plus", brand:"Ring", model:"B09WZBPX7K", item:"1000847839", upc:"840268939861", category:"Home Improvement", mark:"RG", description:"Battery-powered video doorbell with head-to-toe HD+ video.", originalPrice:149.99, offers:[offer("Amazon",129.99,"In Stock","Free shipping"),offer("Home Depot",139.99,"In Stock","Pickup available"),offer("Lowe's",149.99,"Limited Stock","Pickup available")], history:[149,145,139,129,134,129.99] },
  { id:"jump-starter", name:"Boost Plus GB40 Jump Starter", brand:"NOCO", model:"GB40", item:"3180411", upc:"046221150018", category:"Automotive", mark:"NO", description:"Portable 1000-amp lithium jump starter for gasoline and diesel engines.", originalPrice:124.95, offers:[offer("Walmart",99.88,"In Stock","Pickup available"),offer("Amazon",99.95,"In Stock","Free shipping"),offer("eBay",108.5,"In Stock","Standard shipping")], history:[119,114,109,104,99.95,99.88] },
  { id:"dash-cam", name:"Mini 2 Compact Dash Cam", brand:"Garmin", model:"010-02504-00", item:"6464382", upc:"753759269364", category:"Automotive", mark:"GA", description:"Compact 1080p dash camera with voice control and incident recording.", originalPrice:129.99, offers:[offer("Best Buy",109.99,"In Stock","Pickup today"),offer("Walmart",114.99,"Online Only","Free shipping"),offer("Amazon",119,"In Stock","Free shipping")], history:[129,124,119,115,109.99,109.99] },
  { id:"ninja-air-fryer", name:"Foodi 6-in-1 Smart Air Fryer", brand:"Ninja", model:"DZ550", item:"6512365", upc:"622356569033", category:"Appliances", mark:"NJ", description:"Dual-basket air fryer with smart cooking system and six functions.", originalPrice:249.99, offers:[offer("Walmart",179,"In Stock","Pickup available"),offer("Best Buy",189.99,"In Stock","Pickup today"),offer("Amazon",199.99,"In Stock","Free shipping")], history:[229,219,199,189,179,179] },
  { id:"dyson-vacuum", name:"V8 Cordless Vacuum", brand:"Dyson", model:"400473-01", item:"6500879", upc:"885609025962", category:"Appliances", mark:"DY", description:"Lightweight cordless vacuum with whole-machine filtration.", originalPrice:469.99, offers:[offer("Best Buy",349.99,"In Stock","Pickup available"),offer("Walmart",359,"In Stock","Free shipping"),offer("eBay",369.95,"Limited Stock","Standard shipping")], history:[449,429,399,379,359,349.99] },
  { id:"macbook-air", name:"MacBook Air 13-inch M3", brand:"Apple", model:"MRXV3LL/A", item:"6565837", upc:"194253983941", category:"Computers", mark:"MA", description:"Thin 13-inch laptop with Apple M3 chip, 8GB memory, and 256GB SSD.", originalPrice:1099, offers:[offer("Best Buy",899,"In Stock","Pickup available"),offer("Amazon",929,"In Stock","Free shipping"),offer("Walmart",949,"Online Only","Free shipping")], history:[1099,1049,999,949,929,899] },
  { id:"logitech-mouse", name:"MX Master 3S Wireless Mouse", brand:"Logitech", model:"910-006556", item:"6502577", upc:"097855174819", category:"Computers", mark:"LG", description:"Quiet ergonomic wireless mouse with fast scrolling and multi-device control.", originalPrice:99.99, offers:[offer("Best Buy",89.99,"In Stock","Pickup today"),offer("Amazon",91.5,"In Stock","Free shipping"),offer("Walmart",96,"In Stock","Pickup available")], history:[99,99,94,89,92,89.99] },
  { id:"ps5-slim", name:"PlayStation 5 Slim Console", brand:"Sony", model:"CFI-2015", item:"6566039", upc:"711719573364", category:"Gaming", mark:"PS", description:"Disc-edition game console in a slimmer design with 1TB storage.", originalPrice:499.99, offers:[offer("Best Buy",499.99,"In Stock","Pickup available"),offer("Walmart",499.99,"In Stock","Free shipping"),offer("eBay",519,"Limited Stock","Standard shipping")], history:[499,499,529,499,499,499.99] },
  { id:"switch-oled", name:"Switch OLED Model", brand:"Nintendo", model:"HEGSKAAAA", item:"6470923", upc:"045496883386", category:"Gaming", mark:"NS", description:"Hybrid gaming system with a vivid 7-inch OLED display and white Joy-Con.", originalPrice:349.99, offers:[offer("Walmart",329,"In Stock","Pickup available"),offer("Best Buy",349.99,"In Stock","Pickup today"),offer("Amazon",349.99,"In Stock","Free shipping")], history:[349,349,339,349,329,329] },
  { id:"weber-grill", name:"Spirit II E-310 Gas Grill", brand:"Weber", model:"45010001", item:"1000569212", upc:"077924058516", category:"Outdoor", mark:"WB", description:"Three-burner propane grill with open-cart design and folding side table.", originalPrice:569, offers:[offer("Home Depot",499,"In Stock","Store pickup"),offer("Lowe's",529,"Limited Stock","Pickup available"),offer("Amazon",549,"Online Only","Scheduled delivery")], history:[569,559,549,529,499,499] },
  { id:"yeti-cooler", name:"Tundra 45 Hard Cooler", brand:"YETI", model:"10045020000", item:"1000178470", upc:"888830010167", category:"Outdoor", mark:"YT", description:"Durable rotomolded hard cooler designed for extended ice retention.", originalPrice:300, offers:[offer("Lowe's",300,"In Stock","Pickup available"),offer("Amazon",300,"In Stock","Free shipping"),offer("eBay",319,"Limited Stock","Standard shipping")], history:[300,300,300,295,300,300] }
];

const categories = [
  ["Tools","TL"],["Electronics","EL"],["Home Improvement","HI"],["Automotive","AU"],
  ["Appliances","AP"],["Computers","PC"],["Gaming","GM"],["Outdoor","OD"]
];
const retailers = ["Lowe's","Home Depot","Walmart","Best Buy","eBay","Amazon"];
const state = { query:"", category:"", retailer:"", min:"", max:"", availability:"", sort:"low", saved:loadSaved() };
const $ = (selector) => document.querySelector(selector);
const money = (value) => new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" }).format(value);
const lowest = (product) => Math.min(...product.offers.map(item => item.price));
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);

function loadSaved() {
  try { return JSON.parse(localStorage.getItem("priceAlertShoppingList") || "[]").filter(id => typeof id === "string"); }
  catch { return []; }
}
function persistSaved() {
  try { localStorage.setItem("priceAlertShoppingList", JSON.stringify(state.saved)); } catch {}
}
function productVisual(product) { return `<div class="product-visual" data-category="${escapeHtml(product.category)}" aria-label="Visual placeholder for ${escapeHtml(product.name)}">${escapeHtml(product.mark)}</div>`; }
function savedClass(id) { return state.saved.includes(id) ? " saved" : ""; }
function savedLabel(id) { return state.saved.includes(id) ? "Remove from shopping list" : "Save to shopping list"; }

function initializeOptions() {
  $("#category-grid").innerHTML = categories.map(([name,mark]) => {
    const count = products.filter(product => product.category === name).length;
    return `<button class="category-card" type="button" data-category="${escapeHtml(name)}"><span class="category-icon">${mark}</span><span><strong>${escapeHtml(name)}</strong><small>${count} sample products</small></span></button>`;
  }).join("");
  $("#category-filter").insertAdjacentHTML("beforeend", categories.map(([name]) => `<option>${escapeHtml(name)}</option>`).join(""));
  $("#retailer-filter").insertAdjacentHTML("beforeend", retailers.map(name => `<option>${escapeHtml(name)}</option>`).join(""));
}

function searchableText(product) {
  return [product.name,product.brand,product.model,product.item,product.upc,product.category,product.description,...product.offers.map(item => item.retailer)].join(" ").toLowerCase();
}
function offerMatchesFilters(item) {
  if (state.retailer && item.retailer !== state.retailer) return false;
  if (state.availability === "available" && /out of stock/i.test(item.availability)) return false;
  if (state.availability === "pickup" && !/pickup/i.test(item.fulfillment)) return false;
  return true;
}
function filteredProducts() {
  const query = state.query.toLowerCase();
  const matches = products.filter(product => {
    if (query && !searchableText(product).includes(query)) return false;
    if (state.category && product.category !== state.category) return false;
    const eligibleOffers = product.offers.filter(offerMatchesFilters);
    if (!eligibleOffers.length) return false;
    const eligibleLow = Math.min(...eligibleOffers.map(item => item.price));
    if (state.min !== "" && eligibleLow < Number(state.min)) return false;
    if (state.max !== "" && eligibleLow > Number(state.max)) return false;
    return true;
  });
  return matches.sort((a,b) => state.sort === "name" ? a.name.localeCompare(b.name) : state.sort === "high" ? lowest(b)-lowest(a) : lowest(a)-lowest(b));
}

function renderResults({scroll=false}={}) {
  const matches = filteredProducts();
  $("#results").hidden = false;
  $("#product-grid").innerHTML = matches.map(product => `
    <article class="product-card">
      ${productVisual(product)}
      <div class="product-body"><p class="product-brand">${escapeHtml(product.brand)}</p><h3>${escapeHtml(product.name)}</h3>
        <p class="product-meta">Model ${escapeHtml(product.model)} · ${escapeHtml(product.category)}</p>
        <div class="product-price-row"><div class="from-price"><small>Lowest sample price</small><strong>${money(lowest(product))}</strong></div><span class="store-count">${product.offers.length} stores<br>offering it</span></div>
        <div class="card-actions"><button class="button button-primary" type="button" data-compare="${product.id}">Compare Prices</button><button class="button button-secondary save-button${savedClass(product.id)}" type="button" data-save="${product.id}" aria-label="${savedLabel(product.id)}" title="${savedLabel(product.id)}">♡</button></div>
      </div>
    </article>`).join("");
  $("#empty-state").hidden = matches.length !== 0;
  $("#product-grid").hidden = matches.length === 0;
  const context = state.query ? ` for “${state.query}”` : state.category ? ` in ${state.category}` : "";
  $("#results-summary").textContent = `${matches.length} sample product${matches.length === 1 ? "" : "s"}${context}`;
  refreshSaveButtons();
  if (scroll) $("#results").scrollIntoView({behavior:"smooth",block:"start"});
}

function resetFilters() {
  Object.assign(state,{query:"",category:"",retailer:"",min:"",max:"",availability:"",sort:"low"});
  $("#search-input").value = ""; $("#category-filter").value = ""; $("#retailer-filter").value = "";
  $("#min-price").value = ""; $("#max-price").value = ""; $("#availability-filter").value = ""; $("#sort-select").value = "low";
}

function renderDeals() {
  const deals = products.filter(product => product.originalPrice > lowest(product)).sort((a,b) => (b.originalPrice-lowest(b))-(a.originalPrice-lowest(a))).slice(0,3);
  $("#deal-grid").innerHTML = deals.map(product => {
    const savings = Math.round((1-lowest(product)/product.originalPrice)*100);
    return `<article class="deal-card">${productVisual(product)}<div><p class="product-brand">${escapeHtml(product.brand)}</p><h3>${escapeHtml(product.name)}</h3><div class="deal-prices"><strong>${money(lowest(product))}</strong><del>${money(product.originalPrice)}</del></div><p class="savings">Save ${savings}% in this sample offer</p><button class="text-button" type="button" data-compare="${product.id}">Compare sample prices →</button></div></article>`;
  }).join("");
}

function showComparison(id) {
  const product = products.find(item => item.id === id); if (!product) return;
  const offers = [...product.offers].sort((a,b) => a.price-b.price);
  const minHistory = Math.min(...product.history), maxHistory = Math.max(...product.history);
  const range = Math.max(maxHistory-minHistory,1);
  $("#comparison-content").innerHTML = `
    <div class="comparison-top">${productVisual(product)}<div><p class="product-brand">${escapeHtml(product.brand)} · ${escapeHtml(product.category)}</p><h2 id="comparison-title">${escapeHtml(product.name)}</h2><p>Model ${escapeHtml(product.model)} · Item ${escapeHtml(product.item)} · UPC ${escapeHtml(product.upc)}</p><p>${escapeHtml(product.description)}</p></div><div class="comparison-actions"><button class="button button-secondary save-button${savedClass(product.id)}" type="button" data-save="${product.id}">♡ ${state.saved.includes(product.id)?"Saved":"Save to Shopping List"}</button><button class="text-button" type="button" data-close-comparison>Close comparison</button></div></div>
    <div class="comparison-grid"><div class="panel"><h3>Compare sample retailer offers</h3><div class="offer-list">${offers.map((item,index) => `<article class="offer-card${index===0?" best":""}"><div><span class="retailer-name">${escapeHtml(item.retailer)}</span>${index===0?'<span class="best-badge">Best Price</span>':""}</div><div><div>${escapeHtml(item.availability)}</div><div class="offer-detail">${escapeHtml(item.fulfillment)}</div></div><div class="offer-price">${money(item.price)}</div><a class="button button-primary" href="${item.url}" data-sample-link>View Deal</a></article>`).join("")}</div></div>
    <aside class="panel"><h3>Development price history</h3><div class="history-chart" aria-label="Six-month sample price history">${product.history.map((price,index) => `<div class="history-bar" style="--height:${35+((price-minHistory)/range)*65}%" data-price="${money(price)}" title="Month ${index+1}: ${money(price)}"></div>`).join("")}</div><div class="history-labels"><span>6 months ago</span><span>Current sample</span></div>
      <div class="alert-box"><h3>Price Drop Alert</h3><p>Set a target for this product. Alerts are not active in this development version.</p><form class="alert-form" data-alert-form><input type="email" name="email" required placeholder="Email address" aria-label="Email address"><input type="number" name="price" min="1" step=".01" required placeholder="Desired price" aria-label="Desired price"><button class="button button-primary" type="submit">Set Price Alert</button></form><p class="alert-message" data-alert-message hidden></p></div>
    </aside></div>`;
  $("#comparison").hidden = false;
  $("#comparison").scrollIntoView({behavior:"smooth",block:"start"});
}

function toggleSave(id) {
  const index = state.saved.indexOf(id);
  if (index >= 0) { state.saved.splice(index,1); showToast("Removed from your shopping list."); }
  else { state.saved.push(id); showToast("Saved to your shopping list."); }
  persistSaved(); renderShoppingList(); refreshSaveButtons();
}
function refreshSaveButtons() {
  document.querySelectorAll("[data-save]").forEach(button => {
    const saved = state.saved.includes(button.dataset.save);
    button.classList.toggle("saved",saved); button.setAttribute("aria-label",saved?"Remove from shopping list":"Save to shopping list");
    if (button.closest(".comparison-actions")) button.textContent = saved ? "♡ Saved" : "♡ Save to Shopping List";
  });
  $("#nav-list-count").textContent = state.saved.length;
}
function renderShoppingList() {
  const savedProducts = state.saved.map(id => products.find(product => product.id===id)).filter(Boolean);
  $("#clear-list").hidden = !savedProducts.length;
  $("#shopping-list-items").innerHTML = savedProducts.length ? savedProducts.map(product => `<article class="saved-item"><div><strong>${escapeHtml(product.brand)} ${escapeHtml(product.name)}</strong><small>From ${money(lowest(product))} · ${escapeHtml(product.category)}</small></div><button class="remove-item" type="button" data-save="${product.id}" aria-label="Remove ${escapeHtml(product.name)}">×</button></article>`).join("") : '<p class="list-empty">Your shopping list is empty. Save a product to keep it here.</p>';
  refreshSaveButtons();
}

const dialogCopy = {
  about:["About Price Alert","Price Alert is an early front-end concept for finding products, comparing retailer offers, and organizing purchase decisions. All current catalog information is sample development data."],
  privacy:["Privacy","This development version does not send account or alert data to a server. The shopping list is stored only in your browser using localStorage. A production privacy policy will be required before launch."],
  terms:["Terms","Current products, offers, availability, price history, and destination links are demonstrations only and should not be used as purchasing information. Production terms will be added before launch."],
  contact:["Contact","Customer support and business contact channels have not launched yet. A real contact form or support service will require a backend or external provider."]
};
let toastTimer;
function showToast(message) { const toast=$("#toast"); toast.textContent=message; toast.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.hidden=true,2600); }

$("#search-form").addEventListener("submit", event => { event.preventDefault(); state.query=$("#search-input").value.trim(); state.category=""; $("#category-filter").value=""; renderResults({scroll:true}); });
$("#category-grid").addEventListener("click", event => { const button=event.target.closest("[data-category]"); if(!button)return; resetFilters(); state.category=button.dataset.category; $("#category-filter").value=state.category; renderResults({scroll:true}); });
["category-filter","retailer-filter","availability-filter","sort-select"].forEach(id => $("#"+id).addEventListener("change", event => { const keys={"category-filter":"category","retailer-filter":"retailer","availability-filter":"availability","sort-select":"sort"}; state[keys[id]]=event.target.value; renderResults(); }));
["min-price","max-price"].forEach(id => $("#"+id).addEventListener("input", event => { state[id==="min-price"?"min":"max"]=event.target.value; renderResults(); }));
$("#clear-search").addEventListener("click",()=>{ resetFilters(); $("#results").hidden=true; $("#comparison").hidden=true; $("#top").scrollIntoView({behavior:"smooth"}); });
$("#filter-toggle").addEventListener("click",()=>$("#filters").classList.add("open"));
$("#filter-close").addEventListener("click",()=>$("#filters").classList.remove("open"));
$("#menu-toggle").addEventListener("click",event=>{ const open=$("#main-nav").classList.toggle("open"); event.currentTarget.setAttribute("aria-expanded",open); });
$("#main-nav").addEventListener("click",()=>{ $("#main-nav").classList.remove("open"); $("#menu-toggle").setAttribute("aria-expanded","false"); });

document.addEventListener("click", event => {
  const compare=event.target.closest("[data-compare]"); if(compare) showComparison(compare.dataset.compare);
  const save=event.target.closest("[data-save]"); if(save) toggleSave(save.dataset.save);
  if(event.target.closest("[data-close-comparison]")) $("#comparison").hidden=true;
  if(event.target.closest("[data-sample-link]")) { event.preventDefault(); showToast("Sample destination only — affiliate retailer links are not connected yet."); }
  const dialogButton=event.target.closest("[data-dialog]"); if(dialogButton) { const [title,copy]=dialogCopy[dialogButton.dataset.dialog]; $("#dialog-content").innerHTML=`<h2 id="dialog-title">${title}</h2><p>${copy}</p>`; $("#info-dialog").showModal(); }
});
document.addEventListener("submit", event => { if(!event.target.matches("[data-alert-form]"))return; event.preventDefault(); const message=event.target.parentElement.querySelector("[data-alert-message]"); message.textContent="Your request is saved as a preview only. Price alerts will become active when the live alert service launches."; message.hidden=false; event.target.reset(); });
$("#clear-list").addEventListener("click",()=>{ state.saved=[]; persistSaved(); renderShoppingList(); showToast("Shopping list cleared."); });
$("#dialog-close").addEventListener("click",()=>$("#info-dialog").close());
$("#info-dialog").addEventListener("click",event=>{ if(event.target===$("#info-dialog")) $("#info-dialog").close(); });

initializeOptions(); renderDeals(); renderShoppingList();
