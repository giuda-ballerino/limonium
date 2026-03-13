(() => {
  const sections = Array.from(document.querySelectorAll(".section"));
  if (!sections.length) return;
  const HERO_START_PROGRESS_OFFSET = 0.5;

  const sectionPairs = sections
    .map((section, index) => ({
      section,
      transition: section.querySelector(".section__transition"),
      next: sections[index + 1] || null,
    }))
    .filter((pair) => pair.transition && pair.next);

  if (!sectionPairs.length) return;

  const setNextColors = () => {
    sectionPairs.forEach(({ section, next }) => {
      const nextBg = getComputedStyle(next).backgroundColor;
      section.style.setProperty("--next-bg", nextBg);
    });
  };

  const updateTransitions = () => {
    const windowHeight = window.innerHeight;

    sectionPairs.forEach(({ section, transition }) => {
      const rect = section.getBoundingClientRect();
      const height = rect.height || 1;
      const width = rect.width || 1;

      const baseProgress = Math.min(
        Math.max((windowHeight - rect.bottom) / height, 0),
        1,
      );
      const progress = section.classList.contains("hero")
        ? Math.min(baseProgress + HERO_START_PROGRESS_OFFSET, 1)
        : baseProgress;

      const maxRadius = Math.hypot(width / 2, height);
      const radius = progress * maxRadius;

      transition.style.clipPath = `circle(${radius}px at 50% 100%)`;
    });
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      updateTransitions();
      ticking = false;
    });
  };

  setNextColors();
  updateTransitions();

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => {
    setNextColors();
    updateTransitions();
  });
})();
