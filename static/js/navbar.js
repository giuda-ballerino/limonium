(() => {
  const body = document.body;

  if (!body || !body.classList.contains("is-home")) {
    return;
  }

  const heroLogo = document.querySelector(".hero__logo");

  // If the hero logo is not present, keep navbar logo visible.
  if (!heroLogo) {
    body.classList.add("home-logo-out");
    return;
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        body.classList.remove("home-logo-out");
      } else {
        body.classList.add("home-logo-out");
      }
    },
    {
      root: null,
      threshold: 0.05,
    },
  );

  observer.observe(heroLogo);
})();
