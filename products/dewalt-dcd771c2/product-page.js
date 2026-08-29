(function () {
  "use strict";

  const catalog = window.PriceAlertData;
  const linkHelpers = window.PriceAlertRetailerLinks;
  const alertStorage = window.PriceAlertStorage;
  if (!catalog || !Array.isArray(catalog.products) || !linkHelpers || !alertStorage) throw new Error("Price Alert product data failed to load.");

  const product = catalog.products.find(item => item.id === "dewalt-drill" && item.modelNumber === "DCD771C2");
  if (!product) throw new Error("The requested product could not be found.");

  const $ = selector => document.querySelector(selector);
  const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[character]);
  const money = (value, currency = "USD") => new Intl.NumberFormat("en-US", { style:"currency", currency }).format(value);

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

  const offers = product.offers.filter(validOffer).filter(offer => offer.currency === "USD").sort((first, second) => currentPrice(first) - currentPrice(second));
  const bestOffer = offers[0];

  function targetPriceValue(current, percent = 10) {
    return Math.max(.01, Number((current * (1 - percent / 100)).toFixed(2)));
  }

  function targetAlertMarkup() {
    const current = currentPrice(bestOffer);
    const variant = product.variants.find(item => item.isDefaultVariant) || product.variants[0] || null;
    const minimum = Math.max(.01, Number((current * .25).toFixed(2)));
    const maximum = Math.max(minimum, Number((current - .01).toFixed(2)));
    const selected = Math.min(maximum, Math.max(minimum, targetPriceValue(current)));
    return `<section class="target-alert" data-product-alert data-product-id="${escapeHtml(product.id)}" data-variant-id="${escapeHtml(variant ? variant.variantId : "")}" data-current-price="${current}" data-currency="${escapeHtml(bestOffer.currency)}" aria-labelledby="target-alert-title">
      <div class="target-alert-price"><span>Current lowest available price</span><strong>${money(current,bestOffer.currency)}</strong></div>
      <h2 id="target-alert-title">Target Price Alert</h2>
      <p class="target-prompt">Alert me when the price drops to:</p>
      <div class="target-value" aria-live="polite"><output data-target-output>${money(selected,bestOffer.currency)}</output></div>
      <input class="target-slider" data-target-slider type="range" min="${minimum}" max="${maximum}" step="0.01" value="${selected}" aria-label="Target price">
      <div class="target-quick-actions" aria-label="Quick target prices"><button type="button" data-target-percent="5">5% lower</button><button type="button" data-target-percent="10" class="active">10% lower</button><button type="button" data-target-percent="20">20% lower</button></div>
      <p class="target-explanation">Price Alert will notify you if any matched retailer reaches or falls below your target price.</p>
      <form class="target-alert-form" data-target-alert-form novalidate><label><span>Email address</span><input type="email" name="email" autocomplete="email" required placeholder="you@example.com"></label><button class="button button-primary" type="submit">Set Price Alert</button></form>
      <p class="target-alert-message" data-target-message role="status" hidden></p>
    </section>`;
  }

  function validImageUrl(value) {
    if (typeof value !== "string" || !value.trim()) return false;
    try { return ["http:", "https:"].includes(new URL(value, document.baseURI).protocol); }
    catch { return false; }
  }

  function mediaMarkup() {
    const media = product.media || {};
    const mark = product.specifications.visualMark || "PA";
    const alt = media.imageAlt || `${product.brand} ${product.name} product image`;
    if (!validImageUrl(media.primaryImage)) {
      return `<div class="product-visual product-page-visual" data-category="${escapeHtml(product.category)}" data-media-kind="placeholder" role="img" aria-label="Product visual for ${escapeHtml(product.brand)} ${escapeHtml(product.name)}"><span class="product-placeholder">${escapeHtml(mark)}</span></div>`;
    }
    return `<div class="product-visual product-page-visual" data-category="${escapeHtml(product.category)}" data-media-kind="image"><img class="product-image" src="${escapeHtml(media.primaryImage)}" alt="${escapeHtml(alt)}" decoding="async"><span class="product-placeholder" hidden>${escapeHtml(mark)}</span></div>`;
  }

  function useMediaFallback(image) {
    const container = image.closest(".product-visual");
    const placeholder = container && container.querySelector(".product-placeholder");
    if (!container || !placeholder) return;
    image.hidden = true;
    image.removeAttribute("src");
    placeholder.hidden = false;
    container.dataset.mediaKind = "placeholder";
    container.setAttribute("role", "img");
    container.setAttribute("aria-label", `Product visual for ${product.brand} ${product.name}`);
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

  function renderProduct() {
    $("#product-brand").textContent = product.brand;
    $("#product-title").textContent = product.name;
    $("#product-identifiers").textContent = `Model ${product.modelNumber} · UPC ${product.identity.upc}`;
    $("#product-description").textContent = product.description;
    $("#product-media").innerHTML = mediaMarkup();
    $("#lowest-price").textContent = bestOffer ? money(currentPrice(bestOffer), bestOffer.currency) : "Check retailers";
    $("#offer-count").textContent = `${offers.length} retailer option${offers.length === 1 ? "" : "s"}`;
    $("#target-price-alert").innerHTML = targetAlertMarkup();
    $("#specification-list").innerHTML = Object.entries(product.specifications).filter(([key, value]) => key !== "visualMark" && value !== null && value !== "").map(([key, value]) => `<div><dt>${escapeHtml(specificationLabel(key))}</dt><dd>${escapeHtml(displayValue(value))}</dd></div>`).join("");
    $("#offer-list").innerHTML = offers.map((offer, index) => {
      const destination = linkHelpers.resolveOfferDestination(offer, product);
      const savings = validPrice(offer.regularPrice) > currentPrice(offer) ? validPrice(offer.regularPrice) - currentPrice(offer) : 0;
      return `<article class="offer-card${index === 0 ? " best" : ""}"><div><span class="retailer-name">${escapeHtml(offer.retailerName)}</span>${index === 0 ? '<span class="best-badge">Lowest Price</span>' : ""}</div><div><div>${escapeHtml(offer.availability)}</div><div class="offer-detail">${escapeHtml(offer.shipping || "Shipping details vary")}${savings > 0 ? ` · Save ${money(savings, offer.currency)}` : ""}</div></div><div class="offer-price">${money(currentPrice(offer), offer.currency)}</div>${destination ? `<a class="button button-primary" href="${escapeHtml(destination.url)}" target="_blank" rel="noopener noreferrer sponsored" data-retailer-link="${destination.linkType}">${escapeHtml(destination.label)}</a>` : ""}</article>`;
    }).join("");

    const prices = product.priceHistory.map(entry => entry.price);
    const minimum = Math.min(...prices);
    const maximum = Math.max(...prices);
    const range = Math.max(maximum - minimum, 1);
    $("#history-chart").innerHTML = product.priceHistory.map(entry => `<div class="history-bar" style="--height:${35 + ((entry.price - minimum) / range) * 65}%" data-price="${money(entry.price)}" title="${escapeHtml(entry.label)}: ${money(entry.price)}"></div>`).join("");
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
    localStorage.setItem("priceAlertShoppingList", JSON.stringify(saved));
    renderShoppingList();
    const toast = $("#toast");
    toast.textContent = index >= 0 ? "Removed from your Shopping List." : "Added to your Shopping List.";
    toast.hidden = false;
    window.setTimeout(() => { toast.hidden = true; }, 2200);
  }

  document.addEventListener("error", event => { if (event.target && event.target.matches && event.target.matches(".product-image")) useMediaFallback(event.target); }, true);
  $("#save-product").addEventListener("click", toggleSaved);
  $("#shopping-list-items").addEventListener("click", event => { if (event.target.closest("[data-remove-product]")) toggleSaved(); });
  $("#target-price-alert").addEventListener("input", event => { if(!event.target.matches("[data-target-slider]")) return; const alert=event.target.closest("[data-product-alert]"); alert.querySelector("[data-target-output]").textContent=money(Number(event.target.value),alert.dataset.currency); alert.querySelectorAll("[data-target-percent]").forEach(button=>button.classList.remove("active")); });
  $("#target-price-alert").addEventListener("click", event => { const quick=event.target.closest("[data-target-percent]"); if(!quick)return; const alert=quick.closest("[data-product-alert]"); const slider=alert.querySelector("[data-target-slider]"); const current=Number(alert.dataset.currentPrice); slider.value=Math.min(Number(slider.max),Math.max(Number(slider.min),targetPriceValue(current,Number(quick.dataset.targetPercent)))); alert.querySelector("[data-target-output]").textContent=money(Number(slider.value),alert.dataset.currency); alert.querySelectorAll("[data-target-percent]").forEach(button=>button.classList.toggle("active",button===quick)); });
  $("#target-price-alert").addEventListener("submit", event => { if(!event.target.matches("[data-target-alert-form]"))return; event.preventDefault(); const alert=event.target.closest("[data-product-alert]"); const email=event.target.elements.email; const message=alert.querySelector("[data-target-message]"); const result=alertStorage.saveProductAlert({productId:alert.dataset.productId,variantId:alert.dataset.variantId||null,targetPrice:alert.querySelector("[data-target-slider]").value,email:email.value,currency:alert.dataset.currency,currentLowestPrice:alert.dataset.currentPrice}); message.textContent=result.ok?"Price alert saved on this device. Email notifications will be enabled when the Price Alert notification service launches.":result.error; message.classList.toggle("error",!result.ok); message.hidden=false; if(!result.ok) email.focus(); });

  renderProduct();
  renderShoppingList();
}());
