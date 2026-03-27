(function () {
  const container = document.getElementById("shopify-product-detail");
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
    loading: container.dataset.loadingProduct || "Caricamento prodotto...",
    notFound: container.dataset.productNotFound || "Prodotto non trovato.",
    loadError: container.dataset.loadError || "Impossibile caricare i prodotti ora. Riprova tra poco.",
    shopUnconfigured:
      container.dataset.shopUnconfigured ||
      "Shop non ancora configurato. Aggiungi SHOPIFY_STORE_DOMAIN e SHOPIFY_STOREFRONT_ACCESS_TOKEN alle variabili ambiente.",
    selectOptions: container.dataset.selectOptions || "Seleziona opzioni",
    quantityLabel: container.dataset.quantityLabel || "Quantita'",
    buyNow: container.dataset.buyNow || "Acquista ora",
    addToCart: container.dataset.addToCart || "Aggiungi al carrello",
    unavailable: container.dataset.unavailable || "Non disponibile",
    backToShopUrl: container.dataset.backToShopUrl || "/shop/",
  };

  if (!shopDomain || !storefrontToken) {
    container.innerHTML =
      '<p class="shop-message shop-message--error text-off-white">' + escapeHtml(ui.shopUnconfigured) + "</p>";
    return;
  }

  const handle = new URLSearchParams(window.location.search).get("handle");
  if (!handle) {
    container.innerHTML =
      '<p class="shop-message shop-message--error text-off-white">' + escapeHtml(ui.notFound) + "</p>";
    return;
  }

  const query = `
    query ProductByHandle($handle: String!, $language: LanguageCode!, $country: CountryCode!)
      @inContext(language: $language, country: $country) {
      product(handle: $handle) {
        id
        title
        description
        options {
          name
          values
        }
        images(first: 20) {
          edges {
            node {
              url
              altText
            }
          }
        }
        variants(first: 100) {
          edges {
            node {
              id
              title
              availableForSale
              selectedOptions {
                name
                value
              }
              price {
                amount
                currencyCode
              }
              image {
                url
                altText
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
      variables: { handle: handle, language: languageCode, country: countryCode },
    }),
  })
    .then(function (response) {
      if (!response.ok) throw new Error("Shopify request failed with status " + response.status);
      return response.json();
    })
    .then(function (payload) {
      if (payload.errors && payload.errors.length) {
        throw new Error(payload.errors.map(function (err) { return err.message; }).join(", "));
      }

      const product = payload && payload.data ? payload.data.product : null;
      if (!product) {
        container.innerHTML = '<p class="shop-message shop-message--error text-off-white">' + escapeHtml(ui.notFound) + "</p>";
        return;
      }
      render(product);
    })
    .catch(function (error) {
      console.error("Shopify product detail loading error:", error);
      container.innerHTML = '<p class="shop-message shop-message--error text-off-white">' + escapeHtml(ui.loadError) + "</p>";
    });

  function render(product) {
    const variants = (product.variants && product.variants.edges || []).map(function (edge) {
      return edge.node;
    });
    if (!variants.length) {
      container.innerHTML = '<p class="shop-message shop-message--error text-off-white">' + escapeHtml(ui.unavailable) + "</p>";
      return;
    }

    const images = (product.images && product.images.edges || []).map(function (edge) {
      return edge.node;
    });

    const firstAvailable = variants.find(function (v) { return v.availableForSale; }) || variants[0];
    const selected = {};
    (firstAvailable.selectedOptions || []).forEach(function (opt) {
      selected[opt.name] = opt.value;
    });

    const usableOptions = normalizeOptions(product.options || []);

    container.innerHTML =
      '<div class="shop-detail__grid">' +
        '<div class="shop-detail__gallery">' +
          renderGallery(images, firstAvailable, product.title) +
        "</div>" +
        '<div class="shop-detail__info">' +
          '<h1 class="shop-detail__title text-off-white">' + escapeHtml(product.title) + "</h1>" +
          (product.description ? '<p class="shop-detail__description text-off-white">' + escapeHtml(product.description) + "</p>" : "") +
          '<div id="shop-detail-variant-panel"></div>' +
        "</div>" +
      "</div>";
    bindProgressiveImages(container);

    const panel = document.getElementById("shop-detail-variant-panel");
    if (!panel) return;

    const renderState = function () {
      const selectedVariant = findVariantBySelection(variants, selected) || firstAvailable;
      panel.innerHTML = renderVariantPanel(usableOptions, selected, selectedVariant);
      bindVariantEvents(usableOptions, selected, variants, renderState);
      bindActionEvents(selectedVariant);
    };

    renderState();
    bindGalleryEvents();
  }

  function renderGallery(images, variant, title) {
    const variantImage = variant && variant.image ? variant.image : null;
    const mainImage = variantImage || images[0] || null;
    const fallbackAlt = title || "Product";
    const thumbs = images.slice(0, 8);
    return (
      '<div class="shop-detail__main-image-wrap">' +
        (mainImage
          ? '<img id="shop-detail-main-image-placeholder" class="shop-detail__main-image-placeholder" src="' +
              escapeHtml(getDetailMainPlaceholderUrl(mainImage.url)) +
              '" alt="" aria-hidden="true" decoding="async" />' +
              '<img id="shop-detail-main-image" class="shop-detail__main-image js-progressive-image is-loading" src="' +
              escapeHtml(getDetailMainImageUrl(mainImage.url, 1200)) +
              '" srcset="' +
              escapeHtml(getDetailMainSrcset(mainImage.url)) +
              '" sizes="(max-width: 900px) 92vw, 52vw" alt="' +
              escapeHtml(mainImage.altText || fallbackAlt) +
              '" decoding="async" />'
          : '<div class="shop-detail__main-image shop-card__image--placeholder" aria-hidden="true"></div>') +
      "</div>" +
      (thumbs.length
        ? '<div class="shop-detail__thumbs">' +
            thumbs
              .map(function (img, index) {
                return (
                  '<button class="shop-detail__thumb' +
                  (index === 0 ? " is-active" : "") +
                  '" type="button" data-image-url="' +
                  escapeHtml(img.url) +
                  '" data-image-alt="' +
                  escapeHtml(img.altText || fallbackAlt) +
                  '">' +
                    '<span class="shop-detail__thumb-media">' +
                      '<img class="shop-detail__thumb-placeholder" src="' +
                      escapeHtml(getDetailThumbPlaceholderUrl(img.url)) +
                      '" alt="" aria-hidden="true" decoding="async" />' +
                      '<img class="shop-detail__thumb-image js-progressive-image is-loading" src="' +
                      escapeHtml(getDetailThumbUrl(img.url, 160)) +
                      '" srcset="' +
                      escapeHtml(getDetailThumbSrcset(img.url)) +
                      '" sizes="72px" alt="' +
                      escapeHtml(img.altText || fallbackAlt) +
                      '" loading="lazy" decoding="async" />' +
                    "</span>" +
                  "</button>"
                );
              })
              .join("") +
          "</div>"
        : "")
    );
  }

  function renderVariantPanel(options, selected, variant) {
    const amount = variant && variant.price ? Number(variant.price.amount) : 0;
    const currency = variant && variant.price ? variant.price.currencyCode : "EUR";
    const formatted = new Intl.NumberFormat(moneyLocale, { style: "currency", currency: currency }).format(amount);
    const disabled = !variant || !variant.availableForSale;

    const selectors = options
      .map(function (opt) {
        const optionsHtml = (opt.values || [])
          .map(function (value) {
            const isSelected = selected[opt.name] === value;
            return '<option value="' + escapeHtml(value) + '"' + (isSelected ? " selected" : "") + ">" + escapeHtml(value) + "</option>";
          })
          .join("");

        return (
          '<label class="shop-detail__field shop-detail__field--option text-off-white">' +
            '<span>' + escapeHtml(opt.name) + "</span>" +
            '<select class="shop-detail__select" data-option-name="' + escapeHtml(opt.name) + '">' +
              optionsHtml +
            "</select>" +
          "</label>"
        );
      })
      .join("");
    const controlsRowClass =
      "shop-detail__controls-row" + (options.length ? "" : " shop-detail__controls-row--qty-only");

    return (
      '<div class="shop-detail__price text-off-white">' + formatted + "</div>" +
      '<div class="shop-detail__options">' +
        '<p class="shop-detail__label text-off-white">' + escapeHtml(ui.selectOptions) + "</p>" +
        '<div class="' + controlsRowClass + '">' +
          selectors +
          '<label class="shop-detail__field shop-detail__field--qty text-off-white">' +
            "<span>" + escapeHtml(ui.quantityLabel) + "</span>" +
            '<input id="shop-detail-qty" class="shop-detail__qty" type="number" min="1" value="1" />' +
          "</label>" +
        "</div>" +
      "</div>" +
      '<div class="shop-detail__actions">' +
        '<button id="shop-detail-add" class="shop-detail__action-btn shop-detail__action-btn--secondary" type="button" data-variant-id="' + escapeHtml(variant ? variant.id : "") + '"' + (disabled ? " disabled" : "") + ">" +
          escapeHtml(ui.addToCart) +
        "</button>" +
        '<button id="shop-detail-buy" class="shop-detail__action-btn shop-detail__action-btn--primary" type="button" data-variant-id="' + escapeHtml(variant ? variant.id : "") + '"' + (disabled ? " disabled" : "") + ">" +
          escapeHtml(ui.buyNow) +
        "</button>" +
      "</div>" +
      (!disabled ? "" : '<p class="shop-card__availability">' + escapeHtml(ui.unavailable) + "</p>")
    );
  }

  function bindVariantEvents(options, selected, variants, rerender) {
    const selects = container.querySelectorAll(".shop-detail__select");
    selects.forEach(function (select) {
      select.addEventListener("change", function () {
        const name = select.getAttribute("data-option-name");
        if (!name) return;
        selected[name] = select.value;
        const matched = findVariantBySelection(variants, selected);
        if (matched && matched.image && matched.image.url) {
          setMainImage(matched.image.url, matched.image.altText || "");
        }
        rerender();
      });
    });
  }

  function normalizeOptions(options) {
    const list = Array.isArray(options) ? options : [];
    return list.filter(function (opt) {
      const name = String(opt && opt.name ? opt.name : "").trim().toLowerCase();
      const values = Array.isArray(opt && opt.values) ? opt.values : [];
      if (values.length !== 1) return true;
      const onlyValue = String(values[0] || "").trim().toLowerCase();
      // Shopify adds a synthetic "Title / Default Title" option for products without real variants.
      return !(name === "title" && (onlyValue === "default title" || onlyValue === "title"));
    });
  }

  function bindActionEvents(variant) {
    const addBtn = document.getElementById("shop-detail-add");
    const buyBtn = document.getElementById("shop-detail-buy");
    const qtyInput = document.getElementById("shop-detail-qty");
    if (!variant || !addBtn || !buyBtn || !qtyInput) return;

    const getQty = function () {
      const qty = Number(qtyInput.value || 1);
      if (!Number.isFinite(qty) || qty < 1) return 1;
      return Math.floor(qty);
    };

    addBtn.addEventListener("click", function () {
      if (!window.ShopifyCart || typeof window.ShopifyCart.addLine !== "function") return;
      addBtn.disabled = true;
      window.ShopifyCart
        .addLine(variant.id, getQty())
        .catch(function (error) {
          if (error && error.message) window.alert(error.message);
        })
        .finally(function () {
          addBtn.disabled = false;
        });
    });

    buyBtn.addEventListener("click", function () {
      if (!window.ShopifyCart || typeof window.ShopifyCart.buyNowLine !== "function") return;
      buyBtn.disabled = true;
      window.ShopifyCart
        .buyNowLine(variant.id, getQty())
        .catch(function (error) {
          if (error && error.message) window.alert(error.message);
        })
        .finally(function () {
          buyBtn.disabled = false;
        });
    });
  }

  function bindGalleryEvents() {
    container.querySelectorAll(".shop-detail__thumb").forEach(function (button) {
      button.addEventListener("click", function () {
        const url = button.getAttribute("data-image-url");
        const alt = button.getAttribute("data-image-alt");
        if (!url) return;
        setMainImage(url, alt || "");
        container.querySelectorAll(".shop-detail__thumb").forEach(function (btn) {
          btn.classList.remove("is-active");
        });
        button.classList.add("is-active");
      });
    });
  }

  function setMainImage(url, alt) {
    const main = document.getElementById("shop-detail-main-image");
    const placeholder = document.getElementById("shop-detail-main-image-placeholder");
    if (!main) return;
    if (placeholder) {
      placeholder.setAttribute("src", getDetailMainPlaceholderUrl(url));
    }
    main.classList.add("is-loading");
    main.setAttribute("src", getDetailMainImageUrl(url, 1200));
    main.setAttribute("srcset", getDetailMainSrcset(url));
    main.setAttribute("alt", alt);
    watchImageLoad(main);
  }

  function findVariantBySelection(variants, selected) {
    return (
      variants.find(function (variant) {
        const opts = variant.selectedOptions || [];
        return opts.every(function (opt) {
          return selected[opt.name] === opt.value;
        });
      }) || null
    );
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getDetailMainImageUrl(url, width) {
    return buildShopifyImageUrl(url, {
      width: width,
      format: "webp",
      quality: 82,
    });
  }

  function getDetailMainPlaceholderUrl(url) {
    return buildShopifyImageUrl(url, {
      width: 40,
      height: 30,
      crop: "center",
      format: "webp",
      quality: 28,
    });
  }

  function getDetailMainSrcset(url) {
    const widths = [600, 900, 1200, 1600];
    return widths
      .map(function (w) {
        return getDetailMainImageUrl(url, w) + " " + w + "w";
      })
      .join(", ");
  }

  function getDetailThumbUrl(url, width) {
    return buildShopifyImageUrl(url, {
      width: width,
      height: width,
      crop: "center",
      format: "webp",
      quality: 72,
    });
  }

  function getDetailThumbPlaceholderUrl(url) {
    return buildShopifyImageUrl(url, {
      width: 28,
      height: 28,
      crop: "center",
      format: "webp",
      quality: 28,
    });
  }

  function getDetailThumbSrcset(url) {
    const widths = [100, 160, 240];
    return widths
      .map(function (w) {
        return getDetailThumbUrl(url, w) + " " + w + "w";
      })
      .join(", ");
  }

  function buildShopifyImageUrl(url, options) {
    if (!url) return "";
    try {
      const next = new URL(url);
      if (options && options.width) next.searchParams.set("width", String(options.width));
      if (options && options.height) next.searchParams.set("height", String(options.height));
      if (options && options.crop) next.searchParams.set("crop", String(options.crop));
      if (options && options.format) next.searchParams.set("format", String(options.format));
      if (options && options.quality) next.searchParams.set("quality", String(options.quality));
      return next.toString();
    } catch (_) {
      return url;
    }
  }

  function bindProgressiveImages(root) {
    if (!root) return;
    root.querySelectorAll(".js-progressive-image").forEach(function (img) {
      watchImageLoad(img);
    });
  }

  function watchImageLoad(img) {
    if (!img) return;
    if (img.complete) {
      img.classList.remove("is-loading");
      return;
    }
    img.addEventListener(
      "load",
      function () {
        img.classList.remove("is-loading");
      },
      { once: true }
    );
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
