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
      offers: (config.offers||[]).map((offer, index) => createOffer(config, offer, index, variantId)),
      priceHistory: (config.priceHistory||[]).map((price, index) => ({
        recordedAt: null,
        label: index === config.priceHistory.length - 1 ? "Current" : `Month ${index + 1}`,
        price,
        currency: DEFAULT_CURRENCY
      })),
      lastUpdated: null,
      dataStatus: DATA_STATUS
    };
  }

  const existingProducts = [
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

  // Identity-only development records. Retailer offers, prices, trade identifiers,
  // and images intentionally remain empty until an authorized source supplies them.
  const additionalProductRecords = [
    ["dewalt-impact-dcf887b","DeWalt","20V MAX XR Impact Driver","DCF887B","Tools","DW"],["dewalt-saw-dcs570b","DeWalt","20V MAX Circular Saw","DCS570B","Tools","DW"],["dewalt-grinder-dcg413b","DeWalt","20V MAX XR Angle Grinder","DCG413B","Tools","DW"],["dewalt-battery-dcb205","DeWalt","20V MAX 5Ah Battery","DCB205","Tools","DW"],["milwaukee-drill-2804-20","Milwaukee","M18 FUEL Hammer Drill/Driver","2804-20","Tools","MW"],["milwaukee-impact-2853-20","Milwaukee","M18 FUEL Impact Driver","2853-20","Tools","MW"],["milwaukee-cutoff-2522-20","Milwaukee","M12 FUEL Cut-Off Saw","2522-20","Tools","MW"],["makita-drill-xfd131","Makita","18V LXT Brushless Drill/Driver Kit","XFD131","Tools","MK"],["makita-impact-xdt13z","Makita","18V LXT Brushless Impact Driver","XDT13Z","Tools","MK"],["bosch-drill-gsr12v-300b22","Bosch","12V Max Brushless Drill/Driver Kit","GSR12V-300B22","Tools","BO"],["klein-tool-set-80020","Klein Tools","6-Piece Apprentice Tool Set","80020","Tools","KL"],
    ["apple-airpods-4","Apple","AirPods 4","MXP63LL/A","Electronics","AP"],["bose-qc-ultra-headphones","Bose","QuietComfort Ultra Headphones","880066-0100","Electronics","BO"],["jbl-flip-6","JBL","Flip 6 Portable Bluetooth Speaker","JBLFLIP6BLKAM","Electronics","JB"],["roku-streaming-stick-4k","Roku","Streaming Stick 4K","3941R","Electronics","RO"],["chromecast-google-tv-4k","Google","Chromecast with Google TV 4K","GA01919-US","Electronics","GO"],["google-nest-audio","Google Nest","Nest Audio Smart Speaker","GA01420-US","Electronics","NE"],["ring-indoor-cam-2nd-gen","Ring","Indoor Cam (2nd Gen)",null,"Electronics","RG"],["samsung-buds3-pro","Samsung","Galaxy Buds3 Pro","SM-R630","Electronics","SA"],["sony-srs-xb100","Sony","SRS-XB100 Portable Bluetooth Speaker","SRSXB100/B","Electronics","SO"],["bose-soundlink-flex","Bose","SoundLink Flex Portable Speaker",null,"Electronics","BO"],["apple-tv-4k-3rd-gen","Apple","Apple TV 4K (3rd Generation)","MN873LL/A","Electronics","AP"],
    ["ecobee-smart-thermostat-premium","ecobee","Smart Thermostat Premium","EB-STATE6-01","Home Improvement","EC"],["nest-thermostat","Google Nest","Nest Thermostat","GA02081-US","Home Improvement","NE"],["ring-video-doorbell-wired","Ring","Video Doorbell Wired",null,"Home Improvement","RG"],["leviton-decora-smart-dimmer","Leviton","Decora Smart Wi-Fi Dimmer","D26HD-2RW","Home Improvement","LE"],["kasa-smart-switch-hs200","Kasa Smart","Wi-Fi Light Switch","HS200","Home Improvement","KS"],["shop-vac-wet-dry-5989300","Shop-Vac","Wet/Dry Vacuum","5989300","Home Improvement","SV"],["ridgid-wet-dry-vac-wd1450","RIDGID","14-Gallon Wet/Dry Vacuum","WD1450","Home Improvement","RI"],["klein-voltage-tester-ncvt1p","Klein Tools","Non-Contact Voltage Tester","NCVT1P","Home Improvement","KL"],["fluke-117-multimeter","Fluke","117 Electricians Multimeter","117","Home Improvement","FL"],["philips-hue-starter-kit","Philips Hue","White and Color Ambiance Starter Kit",null,"Home Improvement","PH"],["lutron-caseta-dimmer","Lutron","Caseta Wireless Dimmer Switch","PD-6WCL-WH","Home Improvement","LU"],
    ["noco-gb20","NOCO","Boost Sport GB20 Jump Starter","GB20","Automotive","NO"],["noco-gb70","NOCO","Boost HD GB70 Jump Starter","GB70","Automotive","NO"],["noco-genius10","NOCO","GENIUS10 Battery Charger","GENIUS10","Automotive","NO"],["garmin-dash-cam-47","Garmin","Dash Cam 47","010-02505-05","Automotive","GA"],["garmin-dash-cam-67w","Garmin","Dash Cam 67W","010-02505-15","Automotive","GA"],["viair-88p","VIAIR","88P Portable Compressor","00088","Automotive","VI"],["slime-inflator-40026","Slime","2X Pro Power Tire Inflator","40026","Automotive","SL"],["bosch-obd-1300","Bosch","OBD 1300 Automotive Diagnostic Scanner","OBD 1300","Automotive","BO"],["dewalt-inflator-dcc020ib","DeWalt","20V MAX Corded/Cordless Air Inflator","DCC020IB","Automotive","DW"],["battery-tender-plus","Battery Tender","Battery Tender Plus Charger","022-0185G-DL-WH","Automotive","BT"],["astroai-tire-inflator","AstroAI","Portable Tire Inflator",null,"Automotive","AS"],
    ["ninja-air-fryer-af101","Ninja","Air Fryer","AF101","Appliances","NJ"],["ninja-foodi-oven-sp101","Ninja","Foodi Digital Air Fry Oven","SP101","Appliances","NJ"],["ninja-creami-nc301","Ninja","CREAMi Ice Cream Maker","NC301","Appliances","NJ"],["instant-pot-duo-7in1","Instant Pot","Duo 7-in-1 Electric Pressure Cooker",null,"Appliances","IP"],["kitchenaid-artisan-ksm150pser","KitchenAid","Artisan Series 5-Quart Stand Mixer","KSM150PSER","Appliances","KA"],["vitamix-e310","Vitamix","Explorian E310 Blender","E310","Appliances","VI"],["shark-navigator-nv360","Shark","Navigator Lift-Away Deluxe Vacuum","NV360","Appliances","SH"],["shark-stratos-iz862h","Shark","Stratos Cordless Vacuum","IZ862H","Appliances","SH"],["dyson-v15-detect","Dyson","V15 Detect Cordless Vacuum",null,"Appliances","DY"],["keurig-k-elite","Keurig","K-Elite Coffee Maker",null,"Appliances","KE"],
    ["logitech-k380","Logitech","K380 Multi-Device Bluetooth Keyboard","920-007558","Computers","LG"],["logitech-mx-keys-s","Logitech","MX Keys S Wireless Keyboard","920-011406","Computers","LG"],["samsung-t7-shield-2tb","Samsung","T7 Shield 2TB Portable SSD","MU-PE2T0S/AM","Computers","SA"],["wd-my-passport-4tb","Western Digital","My Passport 4TB Portable Hard Drive","WDBPKJ0040BBK-WESN","Computers","WD"],["sandisk-extreme-1tb","SanDisk","Extreme 1TB Portable SSD","SDSSDE61-1T00-G25","Computers","SD"],["dell-ultrasharp-u2723qe","Dell","UltraSharp 27 4K USB-C Hub Monitor","U2723QE","Computers","DE"],["lg-ultragear-27gp850-b","LG","UltraGear 27-inch Gaming Monitor","27GP850-B","Computers","LG"],["tplink-archer-ax55","TP-Link","Archer AX55 Wi-Fi 6 Router","Archer AX55","Computers","TP"],["netgear-nighthawk-rax50","NETGEAR","Nighthawk AX5400 Wi-Fi 6 Router","RAX50","Computers","NG"],["apple-mac-mini-m4","Apple","Mac mini with M4",null,"Computers","MA"],
    ["xbox-series-x","Microsoft","Xbox Series X Console","RRT-00001","Gaming","XB"],["xbox-series-s-512gb","Microsoft","Xbox Series S 512GB Console",null,"Gaming","XB"],["dualsense-white","Sony","DualSense Wireless Controller","CFI-ZCT1W","Gaming","PS"],["xbox-wireless-controller","Microsoft","Xbox Wireless Controller","QAS-00001","Gaming","XB"],["nintendo-switch-lite","Nintendo","Switch Lite","HDH-001","Gaming","NS"],["nintendo-pro-controller","Nintendo","Switch Pro Controller","HAC-013","Gaming","NS"],["playstation-portal","Sony","PlayStation Portal Remote Player","CFI-Y1001","Gaming","PS"],["wd-black-sn850x-2tb","Western Digital","WD_BLACK SN850X 2TB NVMe SSD","WDS200T2X0E","Gaming","WD"],["seagate-xbox-expansion-1tb","Seagate","Storage Expansion Card for Xbox Series X|S 1TB","STJR1000400","Gaming","SG"],["steelseries-arctis-nova-7p","SteelSeries","Arctis Nova 7P Wireless Headset","61559","Gaming","SS"],
    ["weber-q1200","Weber","Q 1200 Gas Grill","51010001","Outdoor","WB"],["weber-original-kettle","Weber","Original Kettle Charcoal Grill","741001","Outdoor","WB"],["coleman-roadtrip-x-cursion","Coleman","RoadTrip X-Cursion Portable Grill","2000033052","Outdoor","CO"],["coleman-sundome-4","Coleman","Sundome 4-Person Tent","2000037525","Outdoor","CO"],["yeti-roadie-24","YETI","Roadie 24 Hard Cooler",null,"Outdoor","YT"],["blackstone-griddle-1554","Blackstone","36-Inch Outdoor Griddle","1554","Outdoor","BL"],["traeger-pro-22","Traeger","Pro Series 22 Pellet Grill","TFB57PZB","Outdoor","TR"],["ego-mower-lm2114","EGO","POWER+ 21-Inch Cordless Lawn Mower","LM2114","Outdoor","EG"],["greenworks-mower-25322","Greenworks","40V 16-Inch Cordless Lawn Mower","25322","Outdoor","GW"],["dewalt-blower-dcbl722p1","DeWalt","20V MAX XR Brushless Handheld Blower Kit","DCBL722P1","Outdoor","DW"]
  ];
  const additionalProducts=additionalProductRecords.map(([recordId,brand,name,modelNumber,category,visualMark])=>{const id=recordId==="nest-thermostat"?"google-nest-thermostat-ga02081":recordId;return createProduct({id,slug:id,brand,name,modelNumber,itemNumber:null,upc:null,category,visualMark,description:`${brand} ${name}${modelNumber?` — model ${modelNumber}`:""}.`});});
  const products=[...existingProducts,...additionalProducts];

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
