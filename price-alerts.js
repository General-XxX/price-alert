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

  window.PriceAlertStorage = Object.freeze({ STORAGE_KEY, validEmail, validMoney, loadAlerts, createAlertRecord, saveProductAlert, developmentAlertTests });
}());
