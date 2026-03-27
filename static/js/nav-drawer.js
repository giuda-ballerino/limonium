(() => {
  const drawer = document.getElementById("site-nav-drawer");
  const toggle = document.getElementById("site-nav-menu-toggle");
  const close = document.getElementById("site-nav-drawer-close");
  const overlay = document.getElementById("site-nav-drawer-overlay");
  const CLOSE_MS = 340;

  if (!drawer || !toggle || !close || !overlay) {
    return;
  }

  const openDrawer = () => {
    drawer.hidden = false;
    window.requestAnimationFrame(() => {
      drawer.classList.add("is-open");
    });
    document.body.classList.add("drawer-open");
    toggle.setAttribute("aria-expanded", "true");
  };

  const closeDrawer = () => {
    if (!drawer.classList.contains("is-open")) {
      return;
    }
    drawer.classList.remove("is-open");
    document.body.classList.remove("drawer-open");
    toggle.setAttribute("aria-expanded", "false");
    window.setTimeout(() => {
      if (!drawer.classList.contains("is-open")) {
        drawer.hidden = true;
      }
    }, CLOSE_MS);
  };

  toggle.addEventListener("click", () => {
    if (drawer.classList.contains("is-open")) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  close.addEventListener("click", closeDrawer);
  overlay.addEventListener("click", closeDrawer);

  drawer.querySelectorAll("[data-drawer-close]").forEach((element) => {
    element.addEventListener("click", closeDrawer);
  });

  drawer.querySelectorAll("[data-cart-toggle]").forEach((element) => {
    element.addEventListener("click", closeDrawer);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawer.classList.contains("is-open")) {
      closeDrawer();
    }
  });
})();
