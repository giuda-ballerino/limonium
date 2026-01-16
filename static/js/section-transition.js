// Section Circular Reveal Transition Effect
// Creates a circle that grows from bottom center, revealing next section's color

(function () {
  "use strict";

  // Get all sections with overlay capability
  const sections = document.querySelectorAll("[data-section]");

  if (sections.length === 0) return;

  // Color mapping for sections (next section's color)
  const sectionColors = {
    hero: "#52489C", // lavender (next after hero)
    about: "#CC5151", // coral red (next after about)
    features: "#DE8756", // peach (next after features)
    cta: null, // no next section
  };

  // Get next section's color
  function getNextSectionColor(currentSection) {
    const sectionName = currentSection.getAttribute("data-section");
    return sectionColors[sectionName] || null;
  }

  // Calculate the maximum radius percentage needed to cover the entire section
  function getMaxRadiusPercent(section) {
    return 150; // 150% ensures full coverage from bottom center
  }

  // Update overlay based on scroll position
  function updateOverlay(section) {
    const overlay = section.querySelector("[data-overlay]");
    if (!overlay) return;

    const rect = section.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const sectionHeight = rect.height;
    const sectionTop = rect.top;
    const sectionBottom = rect.bottom;

    // Get next section's color
    const nextColor = getNextSectionColor(section);
    if (!nextColor) {
      overlay.style.clipPath = "circle(0% at 50% 100%)";
      overlay.style.opacity = "0";
      return;
    }

    overlay.style.backgroundColor = nextColor;

    // Calculate progress: 0 = no circle, 1 = full circle covering section
    // The circle should be visible at the bottom of the section
    // For 100vh sections, show circle when section is fully visible

    let progress = 0;

    if (sectionBottom <= 0) {
      // Section completely scrolled past
      progress = 1;
    } else if (sectionTop >= windowHeight) {
      // Section not yet in viewport
      progress = 0;
    } else {
      // Section is in viewport
      // Calculate based on how much of the section we've scrolled through

      // How much of the section is visible from the top
      const visibleFromTop = Math.min(windowHeight - sectionTop, sectionHeight);

      // For 100vh sections: show good chunk of circle at bottom when fully visible
      // For taller sections: show circle as we approach the bottom
      if (sectionHeight <= windowHeight) {
        // Section fits in viewport (like 100vh hero)
        // Show a good chunk of the circle at the bottom when section is fully visible
        const distanceFromViewportBottom = sectionBottom - windowHeight;
        
        if (distanceFromViewportBottom < 0) {
          // Section bottom is above viewport - circle grows as we scroll past
          const scrollPast = Math.abs(distanceFromViewportBottom);
          // Start from 35% base and grow to 100%
          progress = Math.min(0.35 + (scrollPast / sectionHeight) * 0.65, 1);
        } else {
          // Section bottom is at or below viewport
          // When hero is fully visible (sectionTop <= 0), show 35% circle
          // When section bottom is exactly at viewport bottom, show 35%
          if (sectionTop <= 0 && sectionBottom >= windowHeight) {
            // Hero is fully visible - show 35% circle
            progress = 0.35;
          } else {
            // Section is partially visible - calculate based on visibility
            const visibleRatio = Math.max(0, Math.min(1, distanceFromViewportBottom / windowHeight));
            progress = (1 - visibleRatio) * 0.35; // Fade from 35% to 0% as section becomes less visible
          }
        }
      } else {
        // Section is taller than viewport
        // Show circle when we're viewing the bottom portion
        const distanceFromBottom = sectionBottom - windowHeight;

        if (distanceFromBottom <= 0) {
          // Section bottom is at or above viewport - circle grows
          const scrollPast = Math.abs(distanceFromBottom);
          progress = Math.min(scrollPast / sectionHeight + 0.2, 1);
        } else {
          // Calculate progress based on how close bottom is to viewport
          // Start showing circle when bottom is within 50% of viewport height
          const triggerDistance = windowHeight * 0.5;
          if (distanceFromBottom < triggerDistance) {
            progress =
              ((triggerDistance - distanceFromBottom) / triggerDistance) * 0.2;
          }
        }
      }
    }

    // Calculate the actual radius percentage based on progress
    const maxRadiusPercent = getMaxRadiusPercent(section);
    const currentRadiusPercent = maxRadiusPercent * progress;

    // Apply clip-path with circle growing from bottom center
    overlay.style.clipPath = `circle(${currentRadiusPercent}% at 50% 100%)`;
    // Only show overlay when circle is visible
    overlay.style.opacity = progress > 0 ? "1" : "0";
  }

  // Throttle function for performance
  function throttle(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Handle scroll event
  const handleScroll = throttle(() => {
    sections.forEach((section) => {
      updateOverlay(section);
    });
  }, 10);

  // Initial update
  sections.forEach((section) => {
    updateOverlay(section);
  });

  // Listen to scroll events
  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", handleScroll, { passive: true });
})();
