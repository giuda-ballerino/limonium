#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_VERSION="${SHOPIFY_API_VERSION:-2026-01}"
LIMIT="${1:-12}"

TOKEN_JSON="$("${ROOT_DIR}/scripts/shopify-get-admin-token.sh" --raw)"

ADMIN_TOKEN="$(python3 - <<'PY' "${TOKEN_JSON}"
import json
import sys

payload = json.loads(sys.argv[1])
token = payload.get("access_token", "")
if not token:
    raise SystemExit(1)
print(token)
PY
)"

if [ -f "${ROOT_DIR}/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env.local"
  set +a
elif [ -f "${ROOT_DIR}/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env"
  set +a
fi

if [ -z "${SHOPIFY_STORE_DOMAIN:-}" ]; then
  echo "Missing SHOPIFY_STORE_DOMAIN in .env.local or .env." >&2
  exit 1
fi

QUERY="$(cat <<'EOF'
query GetProducts($first: Int!) {
  products(first: $first, sortKey: CREATED_AT, reverse: true) {
    edges {
      node {
        id
        title
        handle
        productType
        tags
        description
        onlineStoreUrl
        featuredImage {
          url
          altText
        }
        priceRangeV2 {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
}
EOF
)"

RESPONSE="$(
  curl -sS "https://${SHOPIFY_STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json" \
    -H "Content-Type: application/json" \
    -H "X-Shopify-Access-Token: ${ADMIN_TOKEN}" \
    -d "$(python3 - <<'PY' "${QUERY}" "${LIMIT}"
import json
import sys

query = sys.argv[1]
limit = int(sys.argv[2])
print(json.dumps({"query": query, "variables": {"first": limit}}))
PY
)"
)"

OUTPUT_PATH="${ROOT_DIR}/data/shopify-products.json"
mkdir -p "${ROOT_DIR}/data"
printf '%s\n' "${RESPONSE}" > "${OUTPUT_PATH}"

python3 - <<'PY' "${RESPONSE}" "${OUTPUT_PATH}"
import json
import sys

payload = json.loads(sys.argv[1])
output_path = sys.argv[2]

if payload.get("errors"):
    print("Query completed with errors:", file=sys.stderr)
    print(json.dumps(payload["errors"], indent=2), file=sys.stderr)
    sys.exit(1)

edges = (
    payload.get("data", {})
    .get("products", {})
    .get("edges", [])
)

print(f"Fetched {len(edges)} products from Admin API.")
print(f"Saved raw response to: {output_path}")
PY
