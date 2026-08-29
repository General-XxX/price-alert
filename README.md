# Price Alert

## Catalog update modes

The scheduled daily workflow runs only the development fixture in preview mode. It writes a report and preview artifact, but it cannot replace the generated live catalog.

```sh
node scripts/update-catalog.js --mode preview --feed fixtures/daily-update-feed.json
```

Production mode writes a fully validated catalog candidate to `data/catalog.generated.json`. It requires a JSON feed envelope with explicit production approval metadata. Sample, development, fixture, test, demo, or unverified metadata and records are rejected.

```sh
node scripts/update-catalog.js --mode publish --feed path/to/approved-feed.json
```

The production GitHub Actions workflow is manual-only and disabled unless the `PRICE_ALERT_PRODUCTION_PUBLISH_ENABLED` repository variable is exactly `true`. Before enabling it, configure a protected `catalog-production` environment, set `PRICE_ALERT_APPROVED_FEED_PATH` to an approved feed provided by a secure retailer adapter, review the feed approval and image/affiliate authorization process, and add a reviewed deployment step. The current workflow only creates a downloadable candidate artifact and has read-only repository permissions; it does not deploy or commit anything.

## Step 4 retailer connections and public catalog

Retailer adapters live in `scripts/adapters/` and are selected with `--adapter`. `generic-file` accepts approved JSON/CSV files. eBay, Walmart, Lowe's, Home Depot, Target, and Amazon are isolated credential-gated stubs; their declared environment-variable names document the server-side configuration boundary, but the repository contains no credentials and makes no retailer API calls.

The browser loads `data/catalog.generated.json` when it contains only validated `production-approved` records. If the file is missing, inaccessible, empty, or contains unsafe records or image metadata, the current `products.js` development catalog remains in use. The reusable product-detail route is `products/index.html?slug=<slug>`; cards and deal links generate it automatically from catalog slugs. The legacy DeWalt directory redirects to that shared route.

End-to-end production architecture:

```text
approved retailer feed/API
  -> retailer adapter
  -> catalog importer
  -> identity/variant matcher
  -> production validator
  -> data/catalog.generated.json
  -> catalog loader
  -> homepage and reusable product pages
```
