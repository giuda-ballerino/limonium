#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE=""

if [ -f "${ROOT_DIR}/.env.local" ]; then
  ENV_FILE="${ROOT_DIR}/.env.local"
elif [ -f "${ROOT_DIR}/.env" ]; then
  ENV_FILE="${ROOT_DIR}/.env"
else
  echo "Missing .env.local or .env in project root." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

SHOP_DOMAIN="${SHOPIFY_STORE_DOMAIN:-}"
CLIENT_ID="${SHOPIFY_CLIENT_ID:-${SHOPIFY_ADMIN_CLIENT_ID:-}}"
CLIENT_SECRET_SOURCE="explicit"
CLIENT_SECRET="${SHOPIFY_CLIENT_SECRET:-}"

if [ -z "${CLIENT_SECRET}" ] && [ -n "${SHOPIFY_ADMIN_CLIENT_SECRET:-}" ]; then
  CLIENT_SECRET="${SHOPIFY_ADMIN_CLIENT_SECRET}"
fi

if [ -z "${CLIENT_SECRET}" ] && [ -n "${SHOPIFY_STOREFRONT_ACCESS_TOKEN:-}" ]; then
  CLIENT_SECRET="${SHOPIFY_STOREFRONT_ACCESS_TOKEN}"
  CLIENT_SECRET_SOURCE="storefront_token_fallback"
fi

if [ -z "${SHOP_DOMAIN}" ]; then
  echo "Missing SHOPIFY_STORE_DOMAIN in ${ENV_FILE}." >&2
  exit 1
fi

if [ -z "${CLIENT_ID}" ]; then
  echo "Missing SHOPIFY_CLIENT_ID (or SHOPIFY_ADMIN_CLIENT_ID) in ${ENV_FILE}." >&2
  exit 1
fi

if [ -z "${CLIENT_SECRET}" ]; then
  echo "Missing SHOPIFY_CLIENT_SECRET (or SHOPIFY_ADMIN_CLIENT_SECRET) in ${ENV_FILE}." >&2
  exit 1
fi

if [ "${CLIENT_SECRET_SOURCE}" = "storefront_token_fallback" ]; then
  echo "Warning: using SHOPIFY_STOREFRONT_ACCESS_TOKEN as client_secret fallback." >&2
  echo "Prefer setting SHOPIFY_CLIENT_SECRET explicitly." >&2
fi

RESPONSE="$(
  curl -sS -X POST "https://${SHOP_DOMAIN}/admin/oauth/access_token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "grant_type=client_credentials" \
    --data-urlencode "client_id=${CLIENT_ID}" \
    --data-urlencode "client_secret=${CLIENT_SECRET}"
)"

if [ "${1:-}" = "--raw" ]; then
  printf '%s\n' "${RESPONSE}"
  exit 0
fi

python3 - <<'PY' "${RESPONSE}"
import json
import sys

payload = json.loads(sys.argv[1])
token = payload.get("access_token")

if not token:
    print("Failed to generate token. Response:", file=sys.stderr)
    print(json.dumps(payload, indent=2), file=sys.stderr)
    sys.exit(1)

scope = payload.get("scope", "")
expires_in = payload.get("expires_in", "")
masked = token[:10] + "..." + token[-6:] if len(token) > 20 else token

print("Admin OAuth token generated successfully.")
print(f"token: {masked}")
print(f"scope: {scope}")
print(f"expires_in_seconds: {expires_in}")
print("")
print("Use in current shell:")
print(f'export SHOPIFY_ADMIN_ACCESS_TOKEN="{token}"')
PY
