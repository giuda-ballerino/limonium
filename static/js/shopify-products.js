(function () {
  const container = document.getElementById("shopify-products");
  if (!container) return;

  const shopDomain = container.dataset.shopDomain || "";
  const storefrontToken = container.dataset.storefrontToken || "";
  const apiVersion = container.dataset.apiVersion || "2025-01";
  const preferredCategories = (container.dataset.priorityCategories || "")
    .split("|")
    .map(function (value) {
      return value.trim();
    })
    .filter(Boolean);
  const ui = {
    emptyCategory: container.dataset.emptyCategory || "Senza categoria",
    noProducts: container.dataset.noProducts || "Nessun prodotto disponibile al momento.",
    loadError: container.dataset.loadError || "Impossibile caricare i prodotti ora. Riprova tra poco.",
    shopUnconfigured:
      container.dataset.shopUnconfigured ||
      "Shop non ancora configurato. Aggiungi SHOPIFY_STORE_DOMAIN e SHOPIFY_STOREFRONT_ACCESS_TOKEN alle variabili ambiente.",
    buyNow: container.dataset.buyNow || "Acquista ora",
    viewDetails: container.dataset.viewDetails || "Vedi dettagli",
    selectOptions: container.dataset.selectOptions || "Seleziona opzioni",
    quantityLabel: container.dataset.quantityLabel || "Quantita'",
    addToCart: container.dataset.addToCart || "Aggiungi al carrello",
    unavailable: container.dataset.unavailable || "Non disponibile",
  };
  const productDetailBase = container.dataset.productDetailBase || "/shop/product/";

  if (!shopDomain || !storefrontToken) {
    container.innerHTML =
      '<p class="shop-message shop-message--error text-off-white">' + escapeHtml(ui.shopUnconfigured) + "</p>";
    return;
  }

  const endpoint = `https://${shopDomain}/api/${apiVersion}/graphql.json`;
  const preferredLang = getPreferredLanguage();
  const languageCode = preferredLang === "en" ? "EN" : "IT";
  const countryCode = preferredLang === "en" ? "US" : "IT";
  const moneyLocale = preferredLang === "en" ? "en-US" : "it-IT";

  const query = `
    query GetProducts($first: Int!, $language: LanguageCode!, $country: CountryCode!) @inContext(language: $language, country: $country) {
      products(first: $first, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            title
            handle
            description
            productType
            tags
            onlineStoreUrl
            featuredImage {
              url
              altText
            }
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  availableForSale
                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `;

  fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": storefrontToken,
    },
    body: JSON.stringify({
      query: query,
      variables: { first: 12, language: languageCode, country: countryCode },
    }),
  })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Shopify request failed with status " + response.status);
      }
      return response.json();
    })
    .then(function (payload) {
      if (payload.errors && payload.errors.length) {
        throw new Error(payload.errors.map(function (err) { return err.message; }).join(", "));
      }

      const edges =
        payload &&
        payload.data &&
        payload.data.products &&
        payload.data.products.edges
          ? payload.data.products.edges
          : [];

      if (!edges.length) {
        container.innerHTML =
          '<p class="shop-message text-off-white">' + escapeHtml(ui.noProducts) + "</p>";
        return;
      }

      const products = edges.map(function (edge) {
        return edge.node;
      });
      const groupedProducts = groupByCategory(products);
      const orderedCategories = getOrderedCategories(
        Object.keys(groupedProducts),
        preferredCategories
      );
      const orderedProducts = orderedCategories.reduce(function (acc, categoryName) {
        const categoryProducts = groupedProducts[categoryName] || [];
        categoryProducts.forEach(function (product) {
          acc.push({
            product: product,
            categoryName: categoryName,
          });
        });
        return acc;
      }, []);

      const cards = orderedProducts.map(function (entry) {
        return renderProductCard(entry.product, shopDomain, entry.categoryName);
      });
      container.innerHTML = '<div class="shop-grid">' + cards.join("") + "</div>";
    })
    .catch(function (error) {
      console.error("Shopify product loading error:", error);
      container.innerHTML =
        '<p class="shop-message shop-message--error text-off-white">' + escapeHtml(ui.loadError) + "</p>";
    });

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function groupByCategory(products) {
    return products.reduce(function (accumulator, product) {
      const category = getProductCategory(product);
      if (!accumulator[category]) accumulator[category] = [];
      accumulator[category].push(product);
      return accumulator;
    }, {});
  }

  function getOrderedCategories(categoryNames, priorityNames) {
    const matchedPriority = [];

    priorityNames.forEach(function (priorityCategory) {
      const match = categoryNames.find(function (name) {
        return name.toLowerCase() === priorityCategory.toLowerCase();
      });
      if (match && !matchedPriority.includes(match)) {
        matchedPriority.push(match);
      }
    });

    const remaining = categoryNames
      .filter(function (name) {
        return !matchedPriority.includes(name);
      })
      .sort(function (a, b) {
        return a.localeCompare(b, moneyLocale);
      });

    return matchedPriority.concat(remaining);
  }

  function getProductCategory(product) {
    const productType = (product.productType || "").trim();
    if (productType) return productType;

    const categoryTag = (product.tags || []).find(function (tag) {
      return tag.toLowerCase().startsWith("categoria:");
    });
    if (categoryTag) {
      return categoryTag.slice("categoria:".length).trim() || ui.emptyCategory;
    }

    return ui.emptyCategory;
  }

  function renderProductCard(product, domain, categoryName) {
    const imageUrl = product.featuredImage ? product.featuredImage.url : "";
    const imageAlt = (product.featuredImage && product.featuredImage.altText) || product.title;
    const amount = Number(product.priceRange.minVariantPrice.amount);
    const currency = product.priceRange.minVariantPrice.currencyCode;
    const formattedPrice = new Intl.NumberFormat(moneyLocale, {
      style: "currency",
      currency: currency,
    }).format(amount);
    const detailUrl = `${productDetailBase}?handle=${encodeURIComponent(product.handle)}`;
    const productUrl = detailUrl || product.onlineStoreUrl || `https://${domain}/products/${product.handle}`;
    const variantChoices = getVariantChoices(product);
    const selectedChoice = variantChoices.length
      ? getFirstAvailableChoice(variantChoices) || variantChoices[0]
      : null;
    const selectedVariant = variantChoices.length ? selectedChoice : getFirstPurchasableVariant(product);
    const firstVariantId = selectedVariant ? selectedVariant.id : "";
    const isAvailable = Boolean(selectedVariant && selectedVariant.availableForSale);
    const shortDescription = (product.description || "").slice(0, 130);

    return `
      <article class="shop-card-item">
        <div class="shop-card-item__meta">
          <span class="shop-card__category">${escapeHtml(categoryName || ui.emptyCategory)}</span>
        </div>
        <div class="shop-card">
          ${
            imageUrl
              ? `<img class="shop-card__image" src="${imageUrl}" alt="${escapeHtml(
                  imageAlt
                )}" loading="lazy" />`
              : '<div class="shop-card__image shop-card__image--placeholder" aria-hidden="true"></div>'
          }
          <div class="shop-card__body">
            <h3 class="shop-card__title">${escapeHtml(product.title)}</h3>
            ${
              shortDescription
                ? `<p class="shop-card__description">${escapeHtml(shortDescription)}${
                    product.description.length > 130 ? "..." : ""
                  }</p>`
                : ""
            }
            <div class="shop-card__controls">
              ${
                variantChoices.length
                  ? `<label class="shop-card__variant-field">
                      <span>${escapeHtml(ui.selectOptions)}</span>
                      <select class="shop-card__variant-select" ${variantChoices.every(function (choice) { return !choice.availableForSale; }) ? "disabled" : ""}>
                        ${variantChoices
                          .map(function (choice) {
                            return `<option value="${escapeHtml(choice.id)}" data-available="${choice.availableForSale ? "true" : "false"}" ${
                              selectedChoice && choice.id === selectedChoice.id ? "selected" : ""
                            }>${escapeHtml(choice.label)}${choice.availableForSale ? "" : " (" + escapeHtml(ui.unavailable) + ")"}</option>`;
                          })
                          .join("")}
                      </select>
                    </label>`
                  : ""
              }
              <label class="shop-card__qty-field">
                <span>${escapeHtml(ui.quantityLabel)}</span>
                <input class="shop-card__qty-input" type="number" min="1" value="1" />
              </label>
            </div>
            <div class="shop-card__footer">
              <span class="shop-card__price">${formattedPrice}</span>
              ${
                isAvailable
                  ? `<div class="shop-card__actions">
                      <a class="shop-card__link" href="${productUrl}">${escapeHtml(ui.viewDetails)}</a>
                      <button
                        class="shop-card__cart-button"
                        type="button"
                        data-variant-id="${escapeHtml(firstVariantId)}"
                      >
                        ${escapeHtml(ui.addToCart)}
                      </button>
                    </div>`
                  : `<div class="shop-card__actions">
                      <a class="shop-card__link" href="${productUrl}">${escapeHtml(ui.viewDetails)}</a>
                      <span class="shop-card__availability">${escapeHtml(ui.unavailable)}</span>
                    </div>`
              }
            </div>
          </div>
        </div>
      </article>
    `;
  }

  container.addEventListener("click", function (event) {
    const button = event.target.closest(".shop-card__cart-button");
    if (!button) return;

    const card = button.closest(".shop-card");
    const variantSelect = card ? card.querySelector(".shop-card__variant-select") : null;
    const qtyInput = card ? card.querySelector(".shop-card__qty-input") : null;
    const selectedOption = variantSelect
      ? variantSelect.options[variantSelect.selectedIndex]
      : null;
    const variantId = selectedOption ? selectedOption.value : button.dataset.variantId;
    const optionAvailable = selectedOption
      ? selectedOption.dataset.available !== "false"
      : true;
    if (!variantId) return;
    if (!optionAvailable) return;
    if (!window.ShopifyCart || typeof window.ShopifyCart.addLine !== "function") return;
    const quantity = qtyInput ? Math.max(1, Math.floor(Number(qtyInput.value || 1))) : 1;

    button.disabled = true;
    window.ShopifyCart
      .addLine(variantId, quantity)
      .catch(function (error) {
        console.error("Cart add error:", error);
        if (error && error.message) {
          window.alert(error.message);
        }
      })
      .finally(function () {
        button.disabled = false;
      });
  });

  container.addEventListener("change", function (event) {
    const select = event.target.closest(".shop-card__variant-select");
    if (!select) return;

    const selectedOption = select.options[select.selectedIndex];
    const card = select.closest(".shop-card");
    const button = card ? card.querySelector(".shop-card__cart-button") : null;
    if (!button || !selectedOption) return;

    button.dataset.variantId = selectedOption.value || "";
    const isAvailable = selectedOption.dataset.available !== "false";
    button.disabled = !isAvailable;
  });

  function getFirstPurchasableVariant(product) {
    const edges = product && product.variants ? product.variants.edges || [] : [];
    if (!edges.length) return null;

    const availableEdge = edges.find(function (edge) {
      return edge && edge.node && edge.node.availableForSale;
    });

    if (availableEdge && availableEdge.node) return availableEdge.node;
    return edges[0] && edges[0].node ? edges[0].node : null;
  }

  function getVariantChoices(product) {
    const edges = product && product.variants ? product.variants.edges || [] : [];
    const variants = edges
      .map(function (edge) {
        return edge && edge.node ? edge.node : null;
      })
      .filter(Boolean);
    if (!variants.length) return [];

    if (variants.length === 1 && isDefaultVariant(variants[0])) return [];

    return variants.map(function (variant) {
      return {
        id: variant.id,
        availableForSale: Boolean(variant.availableForSale),
        label: getVariantLabel(variant),
      };
    });
  }

  function getFirstAvailableChoice(choices) {
    return choices.find(function (choice) {
      return choice.availableForSale;
    }) || null;
  }

  function getVariantLabel(variant) {
    const selectedOptions = variant && variant.selectedOptions ? variant.selectedOptions : [];
    if (selectedOptions.length) {
      return selectedOptions
        .map(function (opt) {
          return opt && opt.value ? opt.value : "";
        })
        .filter(Boolean)
        .join(" / ");
    }
    return (variant && variant.title ? variant.title : "").trim() || "Option";
  }

  function isDefaultVariant(variant) {
    const title = String((variant && variant.title) || "").trim().toLowerCase();
    return title === "default title" || title === "title";
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
