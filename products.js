// Price Alert catalog data module.
// All records in this file are sample development data, not live retailer data.
(function () {
  "use strict";

  const importer = window.PriceAlertImporter;
  if (!importer) throw new Error("Price Alert catalog importer failed to load.");

  const DATA_STATUS = "sample-development";
  const DEFAULT_CURRENCY = "USD";

  // Flexible, human-readable development specifications. New retailer fields can
  // be added here without requiring category-specific application logic.
  const PRODUCT_SPECIFICATIONS = {
    "dewalt-drill": { voltage:"20V MAX", batteryIncluded:true, batteryCount:2, batteryCapacity:"1.3 Ah", chargerIncluded:true, toolOnly:false, chuckSize:"1/2 in", speed:"0–1,500 RPM", bundleContents:["Drill/driver", "2 batteries", "Charger", "Carrying bag"] },
    "milwaukee-impact": { voltage:"18V", batteryIncluded:true, batteryCount:1, chargerIncluded:true, toolOnly:false, driveSize:"1/4 in hex", brushless:true, speed:"0–3,400 RPM", bundleContents:["Impact driver", "Battery", "Charger", "Tool bag"] },
    "airpods-pro": { connectivity:"Bluetooth", color:"White", bundleContents:["Earbuds", "USB-C charging case", "Ear tips", "USB-C cable"] },
    "sony-headphones": { connectivity:"Bluetooth / 3.5 mm", color:"Black" },
    "nest-thermostat": { connectivity:"Wi-Fi / Bluetooth", color:"Polished silver" },
    "ring-doorbell": { resolution:"1536p HD+", connectivity:"Wi-Fi", color:"Satin nickel", batteryIncluded:true },
    "jump-starter": { capacity:"1000 A peak", batteryIncluded:true, color:"Black" },
    "dash-cam": { resolution:"1080p", connectivity:"Wi-Fi / Bluetooth", color:"Black" },
    "ninja-air-fryer": { capacity:"10 qt", dimensions:"18.94 × 15.39 × 12.8 in", color:"Black / stainless steel", power:"1,690 W" },
    "dyson-vacuum": { capacity:"0.14 gal", dimensions:"49.45 × 9.84 × 8.7 in", color:"Silver / red", power:"Battery powered" },
    "macbook-air": { processor:"Apple M3", memory:"8 GB", storage:"256 GB SSD", screenSize:"13.6 in", operatingSystem:"macOS", color:"Midnight" },
    "logitech-mouse": { connectivity:"Bluetooth / Logi Bolt", color:"Graphite" },
    "ps5-slim": { platform:"PlayStation 5", edition:"Disc Edition", storage:"1 TB", color:"White", bundleContents:["Console", "DualSense controller", "Horizontal stand feet", "Cables"] },
    "switch-oled": { platform:"Nintendo Switch", edition:"OLED Model", storage:"64 GB", screenSize:"7 in", color:"White", bundleContents:["Console", "White Joy-Con pair", "Dock", "Grip", "Cables"] },
    "weber-grill": { size:"Three burner", fuelType:"Liquid propane", material:"Porcelain-enameled steel", color:"Black" },
    "yeti-cooler": { size:"Tundra 45", capacity:"35 qt", material:"Rotomolded polyethylene", color:"White" }
  };

  const retailerNames = [
    ["lowes", "Lowe's"], ["home-depot", "Home Depot"], ["walmart", "Walmart"],
    ["best-buy", "Best Buy"], ["ebay", "eBay"], ["amazon", "Amazon"]
  ];
  const retailers = retailerNames.map(([retailerId, name]) => ({
    retailerId,
    name,
    displayName: name,
    website: null,
    logo: null,
    retailerType: null,
    affiliateProgram: null,
    affiliateNetwork: null,
    affiliateStatus: "not-connected",
    supportsApi: null,
    supportsProductFeed: null,
    supportsPriceUpdates: null,
    supportsAvailability: null,
    supportsShipping: null,
    supportsStorePickup: null,
    dataSource: "sample-development",
    retailerStatus: "sample-development"
  }));

  function finitePrice(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  function createOffer(product, values, index, variantId) {
    const [retailerName, rawPrice, availability, shipping, rawRegularPrice] = [...values, product.regularPrice].slice(0, 5);
    const retailer = retailers.find(item => item.name === retailerName);
    const price = finitePrice(rawPrice);
    const regularPrice = finitePrice(rawRegularPrice);
    const savingsAmount = price !== null && regularPrice !== null && regularPrice > price ? Number((regularPrice - price).toFixed(2)) : 0;
    const savingsPercent = savingsAmount > 0 && regularPrice > 0 ? Number(((savingsAmount / regularPrice) * 100).toFixed(2)) : 0;
    const pickupAvailable = /pickup/i.test(shipping || "");
    const shippingAvailable = /shipping|delivery/i.test(shipping || "");
    return {
      offerId: `${product.id}-${retailer ? retailer.retailerId : "retailer"}-${index + 1}`,
      retailerId: retailer ? retailer.retailerId : null,
      retailerName,
      retailerProductId: null,
      retailerSku: null,
      retailerModelNumber: product.modelNumber,
      variantId,
      price,
      regularPrice,
      salePrice: savingsAmount > 0 ? price : null,
      savingsAmount,
      savingsPercent,
      currency: DEFAULT_CURRENCY,
      saleStatus: savingsAmount > 0 ? "sample-sale" : "regular-price",
      availability,
      stockStatus: /out of stock/i.test(availability || "") ? "out-of-stock" : /limited/i.test(availability || "") ? "limited-stock" : "in-stock",
      quantityAvailable: null,
      shippingAvailable,
      shippingPrice: /free shipping/i.test(shipping || "") ? 0 : null,
      freeShipping: /free shipping/i.test(shipping || "") ? true : null,
      pickupAvailable,
      pickupStore: null,
      deliveryEstimate: null,
      storeLocation: {
        storeId: null,
        storeName: null,
        city: null,
        state: null,
        postalCode: null,
        pickupAvailability: pickupAvailable ? "sample-available" : null,
        storePrice: null
      },
      productUrl: "#",
      affiliateUrl: null,
      affiliateProgram: null,
      affiliateDisclosureRequired: false,
      affiliateTrackingStatus: "not-connected",
      shipping,
      lastChecked: null,
      lastPriceChange: null,
      offerStatus: "sample-active",
      dataSource: "sample-development",
      dataStatus: DATA_STATUS
    };
  }

  function createProduct(config) {
    const categorySpecifications = PRODUCT_SPECIFICATIONS[config.id] || {};
    const variantId = `${config.id}-default`;
    return {
      id: config.id,
      familyId: config.familyId || config.id,
      slug: config.slug || config.id,
      brand: config.brand,
      name: config.name,
      modelNumber: config.modelNumber,
      category: config.category,
      description: config.description,
      media: {
        primaryImage: null,
        galleryImages: [],
        thumbnail: null,
        imageAlt: `${config.brand} ${config.name}`,
        imageSource: null,
        imageSourceType: "placeholder",
        imageLicenseOrPermission: "development-placeholder",
        imageLastUpdated: null,
        videoUrl: null,
        mediaStatus: "sample-placeholder"
      },
      identity: {
        brand: config.brand,
        manufacturer: null,
        modelNumber: config.modelNumber,
        mpn: null,
        upc: config.upc,
        gtin: null,
        sku: null,
        color: null,
        size: null,
        variant: null,
        packageQuantity: null
      },
      retailerIdentifiers: {},
      matching: {
        matchStatus: "development-sample",
        matchConfidence: "not-evaluated",
        matchedBy: [],
        reviewRequired: true
      },
      specifications: {
        itemNumber: config.itemNumber,
        upc: config.upc,
        visualMark: config.visualMark,
        ...categorySpecifications
      },
      variants: [{
        variantId,
        variantName: config.variantName || "Default configuration",
        color: categorySpecifications.color || null,
        size: categorySpecifications.size || categorySpecifications.screenSize || null,
        capacity: categorySpecifications.capacity || null,
        storage: categorySpecifications.storage || null,
        configuration: config.variantConfiguration || null,
        bundleContents: categorySpecifications.bundleContents || [],
        modelNumber: config.modelNumber,
        mpn: null,
        upc: config.upc,
        gtin: null,
        sku: null,
        isDefaultVariant: true,
        variantStatus: "sample-development"
      }],
      offers: config.offers.map((offer, index) => createOffer(config, offer, index, variantId)),
      priceHistory: config.priceHistory.map((price, index) => ({
        recordedAt: null,
        label: index === config.priceHistory.length - 1 ? "Current" : `Month ${index + 1}`,
        price,
        currency: DEFAULT_CURRENCY
      })),
      lastUpdated: null,
      dataStatus: DATA_STATUS
    };
  }

  const products = [
    createProduct({ id:"dewalt-drill", slug:"dewalt-dcd771c2", brand:"DeWalt", name:"20V MAX Cordless Drill Kit", modelNumber:"DCD771C2", itemNumber:"1000050241", upc:"885911325905", category:"Tools", visualMark:"DW", description:"Compact drill/driver kit with two batteries, charger, and carrying bag.", regularPrice:129, offers:[["Home Depot",99,"In Stock","Free store pickup"],["Amazon",104.95,"In Stock","Free shipping"],["Lowe's",109,"Limited Stock","Pickup available"]], priceHistory:[119,115,109,105,109,99] }),
    createProduct({ id:"milwaukee-impact", brand:"Milwaukee", name:"M18 Brushless Impact Driver Kit", modelNumber:"3650-21P", itemNumber:"1001931268", upc:"045242637331", category:"Tools", visualMark:"MW", description:"Brushless impact driver kit built for compact power and everyday fastening.", regularPrice:179, offers:[["Home Depot",149,"In Stock","Free store pickup"],["eBay",154.99,"In Stock","Standard shipping"],["Amazon",159,"In Stock","Free shipping"]], priceHistory:[179,169,165,159,149,149] }),
    createProduct({ id:"airpods-pro", brand:"Apple", name:"AirPods Pro (2nd Generation)", modelNumber:"MTJV3AM/A", itemNumber:"6530591", upc:"194253397168", category:"Electronics", visualMark:"AP", description:"Wireless earbuds with active noise cancellation and USB-C charging case.", regularPrice:249, offers:[["Best Buy",189.99,"In Stock","Pickup today"],["Walmart",194,"In Stock","Free shipping"],["Amazon",199,"In Stock","Free shipping"]], priceHistory:[229,219,209,199,189.99,189.99] }),
    createProduct({ id:"sony-headphones", brand:"Sony", name:"WH-1000XM5 Wireless Headphones", modelNumber:"WH1000XM5/B", itemNumber:"6505727", upc:"027242923775", category:"Electronics", visualMark:"SO", description:"Over-ear wireless headphones with adaptive noise cancellation.", regularPrice:399.99, offers:[["Best Buy",349.99,"In Stock","Pickup available"],["Amazon",348,"In Stock","Free shipping"],["Walmart",359,"Online Only","Free shipping"]], priceHistory:[399,389,379,349,359,348] }),
    createProduct({ id:"nest-thermostat", brand:"Google Nest", name:"Learning Thermostat, 4th Gen", modelNumber:"GA05551-US", itemNumber:"1010159371", upc:"193575037053", category:"Home Improvement", visualMark:"NE", description:"Smart thermostat with an adaptive display and energy-saving schedules.", regularPrice:279.99, offers:[["Lowe's",259,"In Stock","Pickup available"],["Home Depot",264,"In Stock","Free store pickup"],["Best Buy",279.99,"In Stock","Free shipping"]], priceHistory:[279,279,269,264,259,259] }),
    createProduct({ id:"ring-doorbell", brand:"Ring", name:"Battery Doorbell Plus", modelNumber:"B09WZBPX7K", itemNumber:"1000847839", upc:"840268939861", category:"Home Improvement", visualMark:"RG", description:"Battery-powered video doorbell with head-to-toe HD+ video.", regularPrice:149.99, offers:[["Amazon",129.99,"In Stock","Free shipping"],["Home Depot",139.99,"In Stock","Pickup available"],["Lowe's",149.99,"Limited Stock","Pickup available"]], priceHistory:[149,145,139,129,134,129.99] }),
    createProduct({ id:"jump-starter", brand:"NOCO", name:"Boost Plus GB40 Jump Starter", modelNumber:"GB40", itemNumber:"3180411", upc:"046221150018", category:"Automotive", visualMark:"NO", description:"Portable 1000-amp lithium jump starter for gasoline and diesel engines.", regularPrice:124.95, offers:[["Walmart",99.88,"In Stock","Pickup available"],["Amazon",99.95,"In Stock","Free shipping"],["eBay",108.5,"In Stock","Standard shipping"]], priceHistory:[119,114,109,104,99.95,99.88] }),
    createProduct({ id:"dash-cam", brand:"Garmin", name:"Mini 2 Compact Dash Cam", modelNumber:"010-02504-00", itemNumber:"6464382", upc:"753759269364", category:"Automotive", visualMark:"GA", description:"Compact 1080p dash camera with voice control and incident recording.", regularPrice:129.99, offers:[["Best Buy",109.99,"In Stock","Pickup today"],["Walmart",114.99,"Online Only","Free shipping"],["Amazon",119,"In Stock","Free shipping"]], priceHistory:[129,124,119,115,109.99,109.99] }),
    createProduct({ id:"ninja-air-fryer", brand:"Ninja", name:"Foodi 6-in-1 Smart Air Fryer", modelNumber:"DZ550", itemNumber:"6512365", upc:"622356569033", category:"Appliances", visualMark:"NJ", description:"Dual-basket air fryer with smart cooking system and six functions.", regularPrice:249.99, offers:[["Walmart",179,"In Stock","Pickup available"],["Best Buy",189.99,"In Stock","Pickup today"],["Amazon",199.99,"In Stock","Free shipping"]], priceHistory:[229,219,199,189,179,179] }),
    createProduct({ id:"dyson-vacuum", brand:"Dyson", name:"V8 Cordless Vacuum", modelNumber:"400473-01", itemNumber:"6500879", upc:"885609025962", category:"Appliances", visualMark:"DY", description:"Lightweight cordless vacuum with whole-machine filtration.", regularPrice:469.99, offers:[["Best Buy",349.99,"In Stock","Pickup available"],["Walmart",359,"In Stock","Free shipping"],["eBay",369.95,"Limited Stock","Standard shipping"]], priceHistory:[449,429,399,379,359,349.99] }),
    createProduct({ id:"macbook-air", brand:"Apple", name:"MacBook Air 13-inch M3", modelNumber:"MRXV3LL/A", itemNumber:"6565837", upc:"194253983941", category:"Computers", visualMark:"MA", description:"Thin 13-inch laptop with Apple M3 chip, 8GB memory, and 256GB SSD.", regularPrice:1099, offers:[["Best Buy",899,"In Stock","Pickup available"],["Amazon",929,"In Stock","Free shipping"],["Walmart",949,"Online Only","Free shipping"]], priceHistory:[1099,1049,999,949,929,899] }),
    createProduct({ id:"logitech-mouse", brand:"Logitech", name:"MX Master 3S Wireless Mouse", modelNumber:"910-006556", itemNumber:"6502577", upc:"097855174819", category:"Computers", visualMark:"LG", description:"Quiet ergonomic wireless mouse with fast scrolling and multi-device control.", regularPrice:99.99, offers:[["Best Buy",89.99,"In Stock","Pickup today"],["Amazon",91.5,"In Stock","Free shipping"],["Walmart",96,"In Stock","Pickup available"]], priceHistory:[99,99,94,89,92,89.99] }),
    createProduct({ id:"ps5-slim", brand:"Sony", name:"PlayStation 5 Slim Console", modelNumber:"CFI-2015", itemNumber:"6566039", upc:"711719573364", category:"Gaming", visualMark:"PS", description:"Disc-edition game console in a slimmer design with 1TB storage.", regularPrice:499.99, offers:[["Best Buy",499.99,"In Stock","Pickup available"],["Walmart",499.99,"In Stock","Free shipping"],["eBay",519,"Limited Stock","Standard shipping"]], priceHistory:[499,499,529,499,499,499.99] }),
    createProduct({ id:"switch-oled", brand:"Nintendo", name:"Switch OLED Model", modelNumber:"HEGSKAAAA", itemNumber:"6470923", upc:"045496883386", category:"Gaming", visualMark:"NS", description:"Hybrid gaming system with a vivid 7-inch OLED display and white Joy-Con.", regularPrice:349.99, offers:[["Walmart",329,"In Stock","Pickup available"],["Best Buy",349.99,"In Stock","Pickup today"],["Amazon",349.99,"In Stock","Free shipping"]], priceHistory:[349,349,339,349,329,329] }),
    createProduct({ id:"weber-grill", brand:"Weber", name:"Spirit II E-310 Gas Grill", modelNumber:"45010001", itemNumber:"1000569212", upc:"077924058516", category:"Outdoor", visualMark:"WB", description:"Three-burner propane grill with open-cart design and folding side table.", regularPrice:569, offers:[["Home Depot",499,"In Stock","Store pickup"],["Lowe's",529,"Limited Stock","Pickup available"],["Amazon",549,"Online Only","Scheduled delivery"]], priceHistory:[569,559,549,529,499,499] }),
    createProduct({ id:"yeti-cooler", brand:"YETI", name:"Tundra 45 Hard Cooler", modelNumber:"10045020000", itemNumber:"1000178470", upc:"888830010167", category:"Outdoor", visualMark:"YT", description:"Durable rotomolded hard cooler designed for extended ice retention.", regularPrice:300, offers:[["Lowe's",300,"In Stock","Pickup available"],["Amazon",300,"In Stock","Free shipping"],["eBay",319,"Limited Stock","Standard shipping"]], priceHistory:[300,300,300,295,300,300] })
  ];

  const categories = [
    { name:"Tools", visualMark:"TL" },
    { name:"Electronics", visualMark:"EL" },
    { name:"Home Improvement", visualMark:"HI" },
    { name:"Automotive", visualMark:"AU" },
    { name:"Appliances", visualMark:"AP" },
    { name:"Computers", visualMark:"PC" },
    { name:"Gaming", visualMark:"GM" },
    { name:"Outdoor", visualMark:"OD" }
  ];

  const normalizedCatalog = importer.importBatch(products, { dataStatus:DATA_STATUS });
  if (normalizedCatalog.errors.length) throw new Error(`Price Alert catalog normalization failed: ${normalizedCatalog.errors.join("; ")}`);

  window.PriceAlertData = Object.freeze({
    schemaVersion: "1.5.0",
    dataStatus: DATA_STATUS,
    products: normalizedCatalog.products,
    categories,
    retailers
  });
}());
