# Shopify setup (Limonium)

This project reads products from Shopify Storefront API and renders them on `/shop`.

## 1) Basic Shopify store setup

1. Complete onboarding in Shopify admin.
2. Set business details in `Settings -> Store details`.
3. Confirm currency/taxes/shipping in `Settings -> Markets`, `Settings -> Taxes and duties`, and `Settings -> Shipping and delivery`.
4. Add at least 3 test products in `Products`.

For each test product:
- add title, description, price, and at least one image
- keep status `Active`
- make sure it is available on the storefront/publication (channel shown by Shopify, often `Headless`/custom storefront app)
- set `Product type` to one of:
  - `Ortofrutta`
  - `Merchandising`

The website groups products by category using `Product type`.
If `Product type` is empty, it falls back to tags in this format:
- `categoria:Ortofrutta`
- `categoria:Merchandising`

## 2) Create Storefront API token

1. Go to `Settings -> Apps and sales channels`.
2. Open `Develop apps` (if asked, click `Allow custom app development`).
3. Click `Create an app` (example name: `Limonium Website`), then `Create app`.
4. Open the app and click `Configure Storefront API scopes` (or `Configure` under Storefront API, depending on UI version).
5. In the scope list, enable:
   - `unauthenticated_read_product_listings`
   - optionally `unauthenticated_read_product_inventory` if you later show stock
6. Click `Save`.
7. Click `Install app` (or `Install`).
8. Open the app `API credentials` section and copy the **Storefront access token**.

Also copy your `.myshopify.com` domain:
- `Settings -> Domains` (example `your-store.myshopify.com`)

## 3) Run this Hugo site with Shopify env vars

Create a local env file (not tracked by Git), for example `.env.local`:

```bash
cp .env.example .env.local
# then edit .env.local with your real values
```

Example `.env.local`:

```bash
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_token
SHOPIFY_API_VERSION=2025-01
```

Then run:

```bash
./hugo-start
```

Then open:
- `http://localhost:1313/shop`

## 4) Production deployment

Set the same variables in your hosting provider (for example Netlify site env vars):
- `SHOPIFY_STORE_DOMAIN`
- `SHOPIFY_STOREFRONT_ACCESS_TOKEN`
- `SHOPIFY_API_VERSION`

The storefront token is intended for client-side use, but keep scopes minimal (read-only only).

## 5) Troubleshooting

- If `/shop` shows "Shop non ancora configurato":
  - env vars are missing in the process that runs Hugo
- If `/shop` shows loading error:
  - check domain format (`*.myshopify.com`)
  - verify token value and Storefront scopes
  - verify products are active and published to the storefront/channel

## 6) Admin OAuth token flow (local scripts)

If you only have `client_id` + `client_secret`, use these scripts:

1. Put values in `.env.local`:
   - `SHOPIFY_STORE_DOMAIN`
   - `SHOPIFY_CLIENT_ID`
   - `SHOPIFY_CLIENT_SECRET`
   - `SHOPIFY_API_VERSION` (optional; defaults in scripts)
2. In your custom app configuration, also enable **Admin API** scope:
   - `read_products`
   Without this, product queries to Admin GraphQL will return `ACCESS_DENIED`.
3. Generate an Admin OAuth token:

```bash
./scripts/shopify-get-admin-token.sh
```

4. Query products via Admin GraphQL and save response:

```bash
./scripts/shopify-query-admin-products.sh 12
```

This writes raw API output to `data/shopify-products.json`.
