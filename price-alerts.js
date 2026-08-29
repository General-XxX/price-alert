(function () {
  "use strict";

  const STORAGE_KEY = "priceAlertTargets";

  function validEmail(value) {
    return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function validMoney(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Number(number.toFixed(2)) : null;
  }

  function loadAlerts() {
    try {
      const alerts = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(alerts) ? alerts : [];
    } catch {
      return [];
    }
  }

  function createAlertRecord({ productId, variantId = null, targetPrice, email, currency, currentLowestPrice }) {
    const target = validMoney(targetPrice);
    const current = validMoney(currentLowestPrice);
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!productId) return { ok:false, error:"A product is required." };
    if (!validEmail(normalizedEmail)) return { ok:false, error:"Enter a valid email address." };
    if (target === null || current === null || target >= current) return { ok:false, error:"Choose a target price below the current lowest price." };
    const createdAt = new Date().toISOString();
    const record = {
      alertId: `local-${productId}-${variantId || "base"}-${Date.now()}`,
      productId,
      variantId,
      targetPrice: target,
      email: normalizedEmail,
      currency: currency || "USD",
      currentLowestPrice: current,
      createdAt,
      active: true,
      status: "active",
      storageType: "local-device"
    };
    return { ok:true, alert:record };
  }

  function saveProductAlert(input) {
    const result = createAlertRecord(input);
    if (!result.ok) return result;
    const record = result.alert;
    const alerts = loadAlerts();
    const existingIndex = alerts.findIndex(alert => alert.productId === record.productId && alert.variantId === record.variantId && alert.email === record.email && alert.active !== false);
    if (existingIndex >= 0) alerts[existingIndex] = record; else alerts.push(record);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
      return { ok:true, alert:record };
    } catch {
      return { ok:false, error:"The price alert could not be saved on this device." };
    }
  }

  const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[character]);
  const money = (value, currency) => new Intl.NumberFormat("en-US", { style:"currency", currency:currency || "USD" }).format(value);

  function targetPriceValue(currentPrice, percent = 10) {
    return Math.max(.01, Number((currentPrice * (1 - percent / 100)).toFixed(2)));
  }

  function renderTargetAlert(product, currentLowestPrice, currency = "USD") {
    const current = validMoney(currentLowestPrice);
    if (!product || current === null) return "";
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const variant = variants.find(item => item.isDefaultVariant) || variants[0] || null;
    const minimum = Math.max(.01, Number((current * .25).toFixed(2)));
    const maximum = Math.max(minimum, Number((current - .01).toFixed(2)));
    const selected = Math.min(maximum, Math.max(minimum, targetPriceValue(current)));
    const titleId = `target-alert-title-${String(product.id).replace(/[^a-z0-9_-]/gi, "-")}`;
    return `<section class="target-alert" data-product-alert data-product-id="${escapeHtml(product.id)}" data-variant-id="${escapeHtml(variant ? variant.variantId : "")}" data-current-price="${current}" data-currency="${escapeHtml(currency)}" aria-labelledby="${titleId}">
      <div class="target-alert-price"><span>Current lowest available price</span><strong>${money(current,currency)}</strong></div>
      <h3 id="${titleId}">Target Price Alert</h3>
      <p class="target-prompt">Alert me when the price drops to:</p>
      <div class="target-value" aria-live="polite"><output data-target-output>${money(selected,currency)}</output></div>
      <input class="target-slider" data-target-slider type="range" min="${minimum}" max="${maximum}" step="0.01" value="${selected}" aria-label="Target price">
      <div class="target-quick-actions" aria-label="Quick target prices"><button type="button" data-target-percent="5">5% lower</button><button type="button" data-target-percent="10" class="active">10% lower</button><button type="button" data-target-percent="20">20% lower</button></div>
      <p class="target-explanation">Price Alert will notify you if any matched retailer reaches or falls below your target price.</p>
      <form class="target-alert-form" data-target-alert-form novalidate><label><span>Email address</span><input type="email" name="email" autocomplete="email" required placeholder="you@example.com"></label><button class="button button-primary" type="submit">Set Price Alert</button></form>
      <p class="target-alert-message" data-target-message role="status" hidden></p>
    </section>`;
  }

  function mountTargetAlert(container, { product, currentLowestPrice, currency = "USD" }) {
    const mount = typeof container === "string" ? document.querySelector(container) : container;
    if (!mount) return false;
    mount.innerHTML = renderTargetAlert(product, currentLowestPrice, currency);
    const alert = mount.querySelector("[data-product-alert]");
    if (!alert) return false;
    const slider = alert.querySelector("[data-target-slider]");
    const output = alert.querySelector("[data-target-output]");
    const quickButtons = [...alert.querySelectorAll("[data-target-percent]")];
    slider.addEventListener("input", () => { output.textContent = money(Number(slider.value),currency); quickButtons.forEach(button => button.classList.remove("active")); });
    quickButtons.forEach(button => button.addEventListener("click", () => { slider.value=Math.min(Number(slider.max),Math.max(Number(slider.min),targetPriceValue(Number(alert.dataset.currentPrice),Number(button.dataset.targetPercent)))); output.textContent=money(Number(slider.value),currency); quickButtons.forEach(item=>item.classList.toggle("active",item===button)); }));
    alert.querySelector("[data-target-alert-form]").addEventListener("submit", event => { event.preventDefault(); const email=event.currentTarget.elements.email; const message=alert.querySelector("[data-target-message]"); const result=saveProductAlert({productId:alert.dataset.productId,variantId:alert.dataset.variantId||null,targetPrice:slider.value,email:email.value,currency,currentLowestPrice:alert.dataset.currentPrice}); message.textContent=result.ok?"Price alert saved on this device. Email notifications will be enabled when the Price Alert notification service launches.":result.error; message.classList.toggle("error",!result.ok); message.hidden=false; if(!result.ok) email.focus(); });
    return true;
  }

  const developmentAlertTests = (() => {
    const valid = createAlertRecord({ productId:"test-product", variantId:"test-variant", targetPrice:90, email:"Shopper@Example.com", currency:"USD", currentLowestPrice:100 });
    const invalidEmail = createAlertRecord({ productId:"test-product", targetPrice:90, email:"invalid", currency:"USD", currentLowestPrice:100 });
    const invalidTarget = createAlertRecord({ productId:"test-product", targetPrice:100, email:"shopper@example.com", currency:"USD", currentLowestPrice:100 });
    const results = {
      recordShape: valid.ok && ["productId","variantId","targetPrice","email","currency","currentLowestPrice","createdAt","active","status"].every(key => Object.prototype.hasOwnProperty.call(valid.alert,key)),
      emailNormalized: valid.ok && valid.alert.email === "shopper@example.com",
      invalidEmailRejected: !invalidEmail.ok,
      targetMustBeLower: !invalidTarget.ok
    };
    console.assert(results.recordShape, "Alert test failed: backend-ready record shape");
    console.assert(results.emailNormalized, "Alert test failed: email normalization");
    console.assert(results.invalidEmailRejected, "Alert test failed: email validation");
    console.assert(results.targetMustBeLower, "Alert test failed: target price validation");
    return results;
  })();

  window.PriceAlertStorage = Object.freeze({ STORAGE_KEY, validEmail, validMoney, loadAlerts, createAlertRecord, saveProductAlert, targetPriceValue, renderTargetAlert, mountTargetAlert, developmentAlertTests });
}());
