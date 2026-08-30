(function () {
  "use strict";

  window.PriceAlertCatalogReady.then(catalog => {
  const linkHelpers = window.PriceAlertRetailerLinks;
  const alertStorage = window.PriceAlertStorage;
  if (!catalog || !Array.isArray(catalog.products) || !linkHelpers || !alertStorage) throw new Error("Price Alert product data failed to load.");

  const $ = selector => document.querySelector(selector);
  const requestedSlug = document.body.dataset.productSlug || new URLSearchParams(window.location.search).get("slug");
  const product = catalog.products.find(item => item.slug === requestedSlug);
  if (!product) {
    document.title="Product not found | Price Alert";
    const robots=$('meta[name="robots"]'); if(robots)robots.content="noindex, follow";
    const main=$("main"); if(main)main.innerHTML='<section class="section"><div class="shell"><div class="panel unavailable-state"><p class="eyebrow">Product unavailable</p><h1>We could not find that product.</h1><p>The link may be outdated, or the product may no longer be in the catalog.</p><a class="button button-primary" href="../index.html">Return to Price Alert</a></div></div></section>';
    return;
  }
  const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[character]);
  const money = (value, currency = "USD") => new Intl.NumberFormat("en-US", { style:"currency", currency }).format(value);
  const destinationMarkup = destination => destination ? `${destination.requiresNearLinkDisclosure?'<p class="near-link-disclosure">Price Alert may earn a commission from this retailer.</p>':""}<a class="button button-primary" href="${escapeHtml(destination.url)}" target="_blank" rel="${destination.sponsored?'noopener noreferrer sponsored':'noopener noreferrer'}" data-retailer-link="${destination.linkType}">${escapeHtml(destination.label)}</a>` : "";

  function validPrice(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  function currentPrice(offer) {
    return validPrice(offer.salePrice) ?? validPrice(offer.price);
  }

  function validOffer(offer) {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    if (offer.variantId && variants.length && !variants.some(variant => variant.variantId === offer.variantId)) return false;
    if (currentPrice(offer) === null || !offer.currency) return false;
    if (String(offer.stockStatus).toLowerCase() === "out-of-stock") return false;
    return !/out of stock|unavailable/i.test(offer.availability || "");
  }

  const validOffers=(Array.isArray(product.offers)?product.offers:[]).filter(validOffer);
  const displayCurrency=validOffers.some(offer=>offer.currency==="USD")?"USD":validOffers[0]?.currency;
  const offers = validOffers.filter(offer => offer.currency === displayCurrency).sort((first, second) => currentPrice(first) - currentPrice(second));
  const bestOffer = offers[0];

  function validImageUrl(value) {
    if (typeof value !== "string" || !value.trim()) return false;
    try { return ["http:", "https:"].includes(new URL(value, document.baseURI).protocol); }
    catch { return false; }
  }

  function authorizedImage(media) {
    return Boolean(window.PriceAlertMediaResolver&&window.PriceAlertMediaResolver.isAuthorized(media));
  }

  function mediaMarkup() {
    const media = product.media || {};
    const mark = product.specifications&&product.specifications.visualMark || "PA";
    const alt = media.imageAlt || `${product.brand} ${product.name} product image`;
    if (!authorizedImage(media)) {
      return `<div class="product-visual product-page-visual" data-category="${escapeHtml(product.category)}" data-media-kind="placeholder" role="img" aria-label="Product visual for ${escapeHtml(product.brand)} ${escapeHtml(product.name)}"><span class="product-placeholder">${escapeHtml(mark)}</span></div>`;
    }
    const gallery=(media.galleryImages||[]).map((url,index)=>`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${escapeHtml(product.name)} gallery image ${index+1}"><img src="${escapeHtml(url)}" alt="${escapeHtml(alt)} — view ${index+2}" loading="lazy" decoding="async" width="80" height="60"></a>`).join("");
    return `<div><div class="product-visual product-page-visual" data-category="${escapeHtml(product.category)}" data-media-kind="image"><img class="product-image" src="${escapeHtml(media.primaryImage)}" alt="${escapeHtml(alt)}" decoding="async" width="640" height="480"><span class="product-placeholder" hidden>${escapeHtml(mark)}</span></div>${gallery?`<div class="product-gallery" aria-label="Additional product images">${gallery}</div>`:""}</div>`;
  }

  function useMediaFallback(image) {
    window.PriceAlertMediaResolver.fallbackImageElement(image,`${product.brand} ${product.name}`);
  }

  function displayValue(value) {
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) return value.join(", ");
    return value;
  }

  function specificationLabel(key) {
    const labels = { itemNumber:"Item number", upc:"UPC", batteryIncluded:"Battery included", batteryCount:"Battery count", batteryCapacity:"Battery capacity", chargerIncluded:"Charger included", toolOnly:"Tool only", chuckSize:"Chuck size", bundleContents:"Bundle contents" };
    return labels[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, character => character.toUpperCase());
  }

  function updateMetadata() {
    const title = `${product.brand} ${product.name}${product.modelNumber ? ` ${product.modelNumber}` : ""} | Price Alert`;
    const description = `Compare specifications, recorded price history, and available retailer offers for ${product.brand} ${product.name}${product.modelNumber ? ` model ${product.modelNumber}` : ""}.`;
    const canonical = `https://general-xxx.github.io/price-alert/products/index.html?slug=${encodeURIComponent(product.slug)}`;
    document.title = title;
    const set = (selector, attribute, value) => { const element=$(selector); if (element) element.setAttribute(attribute,value); };
    set('meta[name="description"]',"content",description); set('link[rel="canonical"]',"href",canonical);
    set('meta[name="robots"]',"content",product.dataStatus==="production-approved"?"index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1":"noindex, follow");
    set('meta[property="og:title"]',"content",title); set('meta[property="og:description"]',"content",description); set('meta[property="og:url"]',"content",canonical);
    set('meta[name="twitter:title"]',"content",title); set('meta[name="twitter:description"]',"content",description);
    if(product.dataStatus==="production-approved"&&authorizedImage(product.media||{})){set('meta[property="og:image"]',"content",product.media.primaryImage);set('meta[name="twitter:image"]',"content",product.media.primaryImage);}
    const graph = [{ "@type":"BreadcrumbList", itemListElement:[
      { "@type":"ListItem", position:1, name:"Home", item:"https://general-xxx.github.io/price-alert/" },
      { "@type":"ListItem", position:2, name:product.category, item:`https://general-xxx.github.io/price-alert/?category=${encodeURIComponent(product.category)}#results` },
      { "@type":"ListItem", position:3, name:`${product.brand} ${product.name}`, item:canonical }
    ] }];
    if (product.dataStatus === "production-approved") {
      const identity=product.identity||{};
      const structured={ "@type":"Product", name:product.name, url:canonical, description:product.description, brand:{ "@type":"Brand", name:product.brand }, model:product.modelNumber, category:product.category };
      if (identity.gtin) structured.gtin=identity.gtin; else if (identity.upc) structured.gtin12=identity.upc;
      graph.unshift(structured);
    }
    const script=document.createElement("script"); script.type="application/ld+json"; script.dataset.productStructuredData="true"; script.textContent=JSON.stringify({ "@context":"https://schema.org", "@graph":graph }); document.head.appendChild(script);
  }

  function renderProduct() {
    updateMetadata();
    $("#product-brand").textContent = product.brand;
    $("#product-title").textContent = product.name;
    const identity=product.identity||{};
    $("#product-identifiers").textContent = [["Model",product.modelNumber||identity.modelNumber],["MPN",identity.mpn],["UPC",identity.upc],["GTIN",identity.gtin]].filter(([,value])=>value).map(([label,value])=>`${label} ${value}`).join(" · ");
    $("#product-description").textContent = product.description;
    $("#overview-title").textContent = `${product.brand} ${product.name}`;
    $("#overview-copy").textContent = product.description || `Review the listed identity, configuration, and retailer offers for this ${product.category || "product"}.`;
    $("#category-breadcrumb").textContent = product.category;
    $("#breadcrumb-product").textContent = `${product.brand} ${product.name}`;
    [$("#category-nav-link"),$("#category-breadcrumb-link")].forEach(link=>{ link.textContent=product.category; link.href=`../index.html?category=${encodeURIComponent(product.category)}#results`; });
    $("#product-media").innerHTML = mediaMarkup();
    $("#lowest-price").textContent = bestOffer ? money(currentPrice(bestOffer), bestOffer.currency) : "Retailer pricing unavailable";
    $("#offer-count").textContent = `${offers.length} retailer option${offers.length === 1 ? "" : "s"}`;
    if (bestOffer) $("#compare-offers-control").outerHTML='<a class="button button-primary" id="compare-offers-control" href="#retailer-offers">Compare retailer offers</a>';
    if (bestOffer) alertStorage.mountTargetAlert($("#target-price-alert"), { product, currentLowestPrice:currentPrice(bestOffer), currency:bestOffer.currency });
    else $("#target-price-alert").innerHTML = '<p class="list-empty">A Target Price Alert can be set when a priced retailer offer is available.</p>';
    const specificationEntries=Object.entries(product.specifications||{}).filter(([key, value]) => key !== "visualMark" && value !== null && value !== "");
    $("#specification-list").innerHTML = specificationEntries.length?specificationEntries.map(([key, value]) => `<div><dt>${escapeHtml(specificationLabel(key))}</dt><dd>${escapeHtml(displayValue(value))}</dd></div>`).join(""):'<div><dd>Specifications are not available for this product.</dd></div>';
    const variants=Array.isArray(product.variants)?product.variants:[];
    $("#variants-panel").hidden=!variants.length;
    $("#variant-list").innerHTML=variants.map(variant=>`<article class="saved-item"><div><strong>${escapeHtml(variant.variantName||variant.configuration||"Default configuration")}</strong><small>${escapeHtml([variant.modelNumber&&`Model ${variant.modelNumber}`,variant.color,variant.size,variant.capacity,variant.storage].filter(Boolean).join(" · "))}</small></div>${variant.isDefaultVariant?'<span class="best-badge">Default</span>':""}</article>`).join("");
    $("#offer-list").innerHTML = offers.length?offers.map((offer, index) => {
      const destination = linkHelpers.resolveOfferDestination(offer, product);
      const savings = validPrice(offer.regularPrice) > currentPrice(offer) ? validPrice(offer.regularPrice) - currentPrice(offer) : 0;
      return `<article class="offer-card${index === 0 ? " best" : ""}"><div><span class="retailer-name">${escapeHtml(offer.retailerName)}</span>${index === 0 ? '<span class="best-badge">Lowest Price</span>' : ""}</div><div><div>${escapeHtml(offer.availability)}</div><div class="offer-detail">${escapeHtml(offer.shipping || "Shipping details vary")}${savings > 0 ? ` · Save ${money(savings, offer.currency)}` : ""}</div></div><div class="offer-price">${money(currentPrice(offer), offer.currency)}</div>${destinationMarkup(destination)}</article>`;
    }).join(""):'<p class="section-empty">No valid retailer offers are available right now. Check again after retailer information is refreshed.</p>';

    const history=Array.isArray(product.priceHistory)?product.priceHistory.filter(entry=>window.PriceAlertRetailerCompliance.allows(entry.retailerId,"allowPriceHistory")&&validPrice(entry.price)!==null):[];
    if (!history.length) { $("#history-chart").innerHTML='<p class="list-empty">No recorded price history is available yet.</p>'; return; }
    const prices = history.map(entry => entry.price);
    const minimum = Math.min(...prices);
    const maximum = Math.max(...prices);
    const range = Math.max(maximum - minimum, 1);
    $("#history-chart").innerHTML = history.map(entry => `<div class="history-bar" style="--height:${35 + ((entry.price - minimum) / range) * 65}%" data-price="${money(entry.price)}" title="${escapeHtml(entry.label||entry.recordedAt||"")}: ${money(entry.price)}"></div>`).join("");
  }

  function loadSaved() {
    try { return JSON.parse(localStorage.getItem("priceAlertShoppingList") || "[]").filter(id => typeof id === "string"); }
    catch { return []; }
  }

  function renderShoppingList() {
    const saved = loadSaved();
    const isSaved = saved.includes(product.id);
    $("#nav-list-count").textContent = saved.length;
    $("#save-product").textContent = isSaved ? "♡ Saved to Shopping List" : "♡ Add to Shopping List";
    $("#save-product").classList.toggle("saved", isSaved);
    const savedProducts = saved.map(id => catalog.products.find(item => item.id === id)).filter(Boolean);
    $("#shopping-list-items").innerHTML = savedProducts.length ? savedProducts.map(item => `<article class="saved-item"><div><strong>${escapeHtml(item.brand)} ${escapeHtml(item.name)}</strong><small>${escapeHtml(item.category)} · Model ${escapeHtml(item.modelNumber)}</small></div>${item.id === product.id ? `<button class="remove-item" type="button" data-remove-product="${item.id}" aria-label="Remove ${escapeHtml(item.name)}">×</button>` : ""}</article>`).join("") : '<p class="list-empty">Your shopping list is empty.</p>';
  }

  function toggleSaved() {
    const saved = loadSaved();
    const index = saved.indexOf(product.id);
    if (index >= 0) saved.splice(index, 1); else saved.push(product.id);
    try { localStorage.setItem("priceAlertShoppingList", JSON.stringify(saved)); }
    catch { const toast=$("#toast"); toast.textContent="This browser could not save your Shopping List."; toast.hidden=false; return; }
    renderShoppingList();
    const toast = $("#toast");
    toast.textContent = index >= 0 ? "Removed from your Shopping List." : "Added to your Shopping List.";
    toast.hidden = false;
    window.setTimeout(() => { toast.hidden = true; }, 2200);
  }

  document.addEventListener("error", event => { if (!event.target||!event.target.matches)return;if(event.target.matches(".product-image"))useMediaFallback(event.target);else if(event.target.matches(".product-gallery img")){const link=event.target.closest("a");if(link)link.hidden=true;} }, true);
  $("#save-product").addEventListener("click", toggleSaved);
  $("#shopping-list-items").addEventListener("click", event => { if (event.target.closest("[data-remove-product]")) toggleSaved(); });

  renderProduct();
  renderShoppingList();
  });
}());
