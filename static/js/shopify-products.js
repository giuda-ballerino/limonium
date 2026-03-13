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

  if (!shopDomain || !storefrontToken) {
    container.innerHTML =
      '<p class="shop-message shop-message--error text-off-white">Shop non ancora configurato. Aggiungi SHOPIFY_STORE_DOMAIN e SHOPIFY_STOREFRONT_ACCESS_TOKEN alle variabili ambiente.</p>';
    return;
  }

  const endpoint = `https://${shopDomain}/api/${apiVersion}/graphql.json`;

  const query = `
    query GetProducts($first: Int!) {
      products(first: $first, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            title
            handle
            description
            productType
            tags
            featuredImage {
              url
              altText
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
      variables: { first: 12 },
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
          '<p class="shop-message text-off-white">Nessun prodotto disponibile al momento.</p>';
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

      container.innerHTML = orderedCategories
        .map(function (categoryName) {
          const categoryProducts = groupedProducts[categoryName] || [];
          const cards = categoryProducts.map(function (product) {
            return renderProductCard(product, shopDomain);
          });

          return `
            <section class="shop-category">
              <h2 class="shop-category__title text-off-white">${escapeHtml(categoryName)}</h2>
              <div class="shop-grid">
                ${cards.join("")}
              </div>
            </section>
          `;
        })
        .join("");
    })
    .catch(function (error) {
      console.error("Shopify product loading error:", error);
      container.innerHTML =
        '<p class="shop-message shop-message--error text-off-white">Impossibile caricare i prodotti ora. Riprova tra poco.</p>';
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
        return a.localeCompare(b, "it");
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
      return categoryTag.slice("categoria:".length).trim() || "Senza categoria";
    }

    return "Senza categoria";
  }

  function renderProductCard(product, domain) {
    const imageUrl = product.featuredImage ? product.featuredImage.url : "";
    const imageAlt = (product.featuredImage && product.featuredImage.altText) || product.title;
    const amount = Number(product.priceRange.minVariantPrice.amount);
    const currency = product.priceRange.minVariantPrice.currencyCode;
    const formattedPrice = new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: currency,
    }).format(amount);
    const productUrl = `https://${domain}/products/${product.handle}`;
    const shortDescription = (product.description || "").slice(0, 130);

    return `
      <article class="shop-card">
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
          <div class="shop-card__footer">
            <span class="shop-card__price">${formattedPrice}</span>
            <a class="shop-card__link" href="${productUrl}" target="_blank" rel="noopener">Acquista</a>
          </div>
        </div>
      </article>
    `;
  }
})();
