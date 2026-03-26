(function () {
  const STORAGE_KEY = "limonium_shopify_cart_id";
  const container =
    document.getElementById("shopify-products") ||
    document.getElementById("shopify-product-detail");
  if (!container) return;

  const shopDomain = container.dataset.shopDomain || "";
  const storefrontToken = container.dataset.storefrontToken || "";
  const apiVersion = container.dataset.apiVersion || "2025-01";
  const endpoint = `https://${shopDomain}/api/${apiVersion}/graphql.json`;
  const preferredLang = getPreferredLanguage();
  const languageCode = preferredLang === "en" ? "EN" : "IT";
  const countryCode = preferredLang === "en" ? "US" : "IT";
  const moneyLocale = preferredLang === "en" ? "en-US" : "it-IT";
  const ui = {
    cartEmpty: container.dataset.cartEmpty || "Il carrello e' vuoto.",
    totalLabel: container.dataset.totalLabel || "Totale",
    removeLabel: container.dataset.removeLabel || "Rimuovi",
    unavailableCartError:
      container.dataset.unavailableCartError || "Prodotto non disponibile per la vendita.",
  };

  let cart = null;
  let isLoading = false;

  const refs = {
    toggle: document.getElementById("shop-cart-toggle") || document.getElementById("site-nav-cart-toggle"),
    close: document.getElementById("shop-cart-close"),
    drawer: document.getElementById("shop-cart-drawer"),
    count: document.getElementById("shop-cart-count"),
    items: document.getElementById("shop-cart-items"),
    total: document.getElementById("shop-cart-total"),
    checkout: document.getElementById("shop-cart-checkout"),
  };

  window.ShopifyCart = {
    init: init,
    addLine: addLine,
    buyNowLine: buyNowLine,
    open: openDrawer,
    refresh: loadCart,
  };

  init();

  function init() {
    if (!shopDomain || !storefrontToken) return;
    mountDrawerToBody();
    bindEvents();
    loadCart();
  }

  function mountDrawerToBody() {
    if (!refs.drawer) return;
    if (refs.drawer.parentElement !== document.body) {
      document.body.appendChild(refs.drawer);
    }
  }

  function bindEvents() {
    if (refs.toggle) refs.toggle.addEventListener("click", openDrawer);
    if (refs.close) refs.close.addEventListener("click", closeDrawer);
    if (refs.checkout) {
      refs.checkout.addEventListener("click", function () {
        if (cart && cart.checkoutUrl) window.location.href = cart.checkoutUrl;
      });
    }
    if (refs.items) {
      refs.items.addEventListener("click", function (event) {
        const button = event.target.closest("button[data-action]");
        if (!button) return;
        const lineId = button.dataset.lineId;
        if (!lineId || !cart) return;

        const line = findLine(lineId);
        if (!line) return;

        if (button.dataset.action === "remove") {
          removeLine(lineId);
        } else if (button.dataset.action === "dec") {
          const next = Math.max(0, line.quantity - 1);
          if (next === 0) removeLine(lineId);
          else updateLine(lineId, next);
        } else if (button.dataset.action === "inc") {
          updateLine(lineId, line.quantity + 1);
        }
      });
    }
  }

  function findLine(lineId) {
    if (!cart || !cart.lines || !cart.lines.edges) return null;
    const edge = cart.lines.edges.find(function (entry) {
      return entry.node.id === lineId;
    });
    return edge ? edge.node : null;
  }

  function openDrawer() {
    if (!refs.drawer) return;
    refs.drawer.hidden = false;
    refs.drawer.classList.add("is-open");
  }

  function closeDrawer() {
    if (!refs.drawer) return;
    refs.drawer.classList.remove("is-open");
    refs.drawer.hidden = true;
  }

  function loadCart() {
    const cartId = window.localStorage.getItem(STORAGE_KEY);
    if (!cartId) {
      render();
      return Promise.resolve(null);
    }
    return fetchStorefront(getCartQuery(cartId))
      .then(function (payload) {
        const nextCart = payload && payload.data ? payload.data.cart : null;
        if (!nextCart) {
          window.localStorage.removeItem(STORAGE_KEY);
          cart = null;
        } else {
          cart = nextCart;
        }
        render();
        return cart;
      })
      .catch(function () {
        render();
      });
  }

  function ensureCart() {
    if (cart && cart.id) return Promise.resolve(cart);
    return fetchStorefront(createCartMutation())
      .then(function (payload) {
        const created = payload && payload.data ? payload.data.cartCreate : null;
        if (!created || !created.cart) throw new Error("Unable to create cart.");
        cart = created.cart;
        window.localStorage.setItem(STORAGE_KEY, cart.id);
        render();
        return cart;
      });
  }

  function addLine(merchandiseId, quantity) {
    if (!merchandiseId) return Promise.reject(new Error("Missing variant id."));
    if (isLoading) return Promise.resolve();
    isLoading = true;

    return ensureCart()
      .then(function (activeCart) {
        return fetchStorefront(addLineMutation(activeCart.id, merchandiseId, quantity || 1));
      })
      .then(function (payload) {
        const result = payload && payload.data ? payload.data.cartLinesAdd : null;
        if (!result || !result.cart) throw new Error("Unable to add line.");
        cart = result.cart;
        if (!hasPurchasableLines(cart)) {
          throw new Error(ui.unavailableCartError);
        }
        render();
        openDrawer();
      })
      .finally(function () {
        isLoading = false;
      });
  }

  function buyNowLine(merchandiseId, quantity) {
    return addLine(merchandiseId, quantity).then(function () {
      if (cart && cart.checkoutUrl) {
        window.location.href = cart.checkoutUrl;
      }
    });
  }

  function updateLine(lineId, quantity) {
    if (isLoading || !cart) return;
    isLoading = true;
    fetchStorefront(updateLineMutation(cart.id, lineId, quantity))
      .then(function (payload) {
        const result = payload && payload.data ? payload.data.cartLinesUpdate : null;
        if (!result || !result.cart) return;
        cart = result.cart;
        render();
      })
      .finally(function () {
        isLoading = false;
      });
  }

  function removeLine(lineId) {
    if (isLoading || !cart) return;
    isLoading = true;
    fetchStorefront(removeLineMutation(cart.id, lineId))
      .then(function (payload) {
        const result = payload && payload.data ? payload.data.cartLinesRemove : null;
        if (!result || !result.cart) return;
        cart = result.cart;
        render();
      })
      .finally(function () {
        isLoading = false;
      });
  }

  function render() {
    const rawLines = cart && cart.lines ? cart.lines.edges : [];
    const lines = rawLines.filter(function (edge) {
      const quantity = Number(edge && edge.node ? edge.node.quantity : 0);
      return Number.isFinite(quantity) && quantity > 0;
    });
    const itemCount = lines.reduce(function (total, edge) {
      return total + Number(edge.node.quantity || 0);
    }, 0);

    if (refs.count) refs.count.textContent = String(itemCount);
    if (refs.checkout) refs.checkout.disabled = !cart || !cart.checkoutUrl || lines.length === 0;
    if (refs.total) {
      refs.total.textContent = ui.totalLabel + ": " + formatMoney(getCartTotalAmount(lines));
    }

    if (!refs.items) return;
    if (!lines.length) {
      refs.items.innerHTML = '<p class="shop-cart-empty">' + escapeHtml(ui.cartEmpty) + "</p>";
      return;
    }

    refs.items.innerHTML = lines
      .map(function (edge) {
        const line = edge.node;
        const title = line.merchandise.product.title;
        const variantTitle = line.merchandise.title || "";
        const linePrice = formatMoney(line.cost.totalAmount);
        return (
          '<div class="shop-cart-item">' +
          '<div class="shop-cart-item__main">' +
          '<p class="shop-cart-item__title">' + escapeHtml(title) + "</p>" +
          (variantTitle && variantTitle !== "Default Title"
            ? '<p class="shop-cart-item__variant">' + escapeHtml(variantTitle) + "</p>"
            : "") +
          '<p class="shop-cart-item__price">' + linePrice + "</p>" +
          "</div>" +
          '<div class="shop-cart-item__actions">' +
          '<button type="button" data-action="dec" data-line-id="' + line.id + '">-</button>' +
          '<span>' + line.quantity + "</span>" +
          '<button type="button" data-action="inc" data-line-id="' + line.id + '">+</button>' +
          '<button type="button" data-action="remove" data-line-id="' + line.id + '">' + escapeHtml(ui.removeLabel) + "</button>" +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  function fetchStorefront(queryPayload) {
    return fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontToken,
      },
      body: JSON.stringify(queryPayload),
    })
      .then(function (response) {
        if (!response.ok) throw new Error("Request failed with status " + response.status);
        return response.json();
      })
      .then(function (payload) {
        if (payload.errors && payload.errors.length) {
          throw new Error(payload.errors.map(function (err) { return err.message; }).join(", "));
        }
        return payload;
      });
  }

  function cartSelectionSet() {
    return `
      id
      checkoutUrl
      cost {
        totalAmount {
          amount
          currencyCode
        }
      }
      lines(first: 50) {
        edges {
          node {
            id
            quantity
            cost {
              totalAmount {
                amount
                currencyCode
              }
            }
            merchandise {
              ... on ProductVariant {
                id
                title
                product {
                  title
                }
              }
            }
          }
        }
      }
    `;
  }

  function getCartQuery(cartId) {
    return {
      query: `
        query GetCart($id: ID!, $language: LanguageCode!, $country: CountryCode!) @inContext(language: $language, country: $country) {
          cart(id: $id) {
            ${cartSelectionSet()}
          }
        }
      `,
      variables: { id: cartId, language: languageCode, country: countryCode },
    };
  }

  function createCartMutation() {
    return {
      query: `
        mutation CartCreate($language: LanguageCode!, $country: CountryCode!) @inContext(language: $language, country: $country) {
          cartCreate {
            cart {
              ${cartSelectionSet()}
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      variables: { language: languageCode, country: countryCode },
    };
  }

  function addLineMutation(cartId, merchandiseId, quantity) {
    return {
      query: `
        mutation AddLine($cartId: ID!, $lines: [CartLineInput!]!, $language: LanguageCode!, $country: CountryCode!) @inContext(language: $language, country: $country) {
          cartLinesAdd(cartId: $cartId, lines: $lines) {
            cart {
              ${cartSelectionSet()}
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      variables: {
        cartId: cartId,
        lines: [{ merchandiseId: merchandiseId, quantity: quantity }],
        language: languageCode,
        country: countryCode,
      },
    };
  }

  function updateLineMutation(cartId, lineId, quantity) {
    return {
      query: `
        mutation UpdateLine($cartId: ID!, $lines: [CartLineUpdateInput!]!, $language: LanguageCode!, $country: CountryCode!) @inContext(language: $language, country: $country) {
          cartLinesUpdate(cartId: $cartId, lines: $lines) {
            cart {
              ${cartSelectionSet()}
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      variables: {
        cartId: cartId,
        lines: [{ id: lineId, quantity: quantity }],
        language: languageCode,
        country: countryCode,
      },
    };
  }

  function removeLineMutation(cartId, lineId) {
    return {
      query: `
        mutation RemoveLine($cartId: ID!, $lineIds: [ID!]!, $language: LanguageCode!, $country: CountryCode!) @inContext(language: $language, country: $country) {
          cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
            cart {
              ${cartSelectionSet()}
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      variables: {
        cartId: cartId,
        lineIds: [lineId],
        language: languageCode,
        country: countryCode,
      },
    };
  }

  function formatMoney(amountObj) {
    if (!amountObj) return "EUR 0,00";
    const amount = Number(amountObj.amount || 0);
    const currency = amountObj.currencyCode || "EUR";
    return new Intl.NumberFormat(moneyLocale, {
      style: "currency",
      currency: currency,
    }).format(amount);
  }

  function getCartTotalAmount(lines) {
    if (cart && cart.cost && cart.cost.totalAmount && Number(cart.cost.totalAmount.amount) > 0) {
      return cart.cost.totalAmount;
    }

    const total = lines.reduce(function (sum, edge) {
      const amount =
        edge &&
        edge.node &&
        edge.node.cost &&
        edge.node.cost.totalAmount
          ? Number(edge.node.cost.totalAmount.amount || 0)
          : 0;
      return sum + amount;
    }, 0);

    return {
      amount: String(total),
      currencyCode:
        (cart &&
          cart.cost &&
          cart.cost.totalAmount &&
          cart.cost.totalAmount.currencyCode) ||
        "EUR",
    };
  }

  function hasPurchasableLines(nextCart) {
    const edges = nextCart && nextCart.lines ? nextCart.lines.edges || [] : [];
    return edges.some(function (edge) {
      return Number(edge && edge.node ? edge.node.quantity : 0) > 0;
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getPreferredLanguage() {
    const normalize = function (value) {
      const v = String(value || "").toLowerCase();
      return v.startsWith("en") ? "en" : "it";
    };

    const bodyLang = document.body && document.body.dataset ? document.body.dataset.lang : "";
    if (bodyLang) return normalize(bodyLang);

    const htmlLang = document.documentElement ? document.documentElement.lang : "";
    if (htmlLang) return normalize(htmlLang);

    const stored = window.localStorage.getItem("limonium-language");
    if (stored) return normalize(stored);

    return normalize(navigator.language || "it");
  }
})();
