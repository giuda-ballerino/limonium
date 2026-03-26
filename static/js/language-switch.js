(() => {
  const body = document.body;
  if (!body) return;

  const STORAGE_KEY = "limonium-language";
  const SCROLL_KEY = "limonium-language-scroll";
  const supported = ["it", "en"];

  const normalize = (value) => {
    const v = (value || "").toLowerCase();
    return v.startsWith("en") ? "en" : "it";
  };

  const getPath = (url) => {
    try {
      return new URL(url, window.location.origin).pathname;
    } catch (_) {
      return "";
    }
  };

  const saveScrollForTarget = (targetUrl) => {
    const doc = document.documentElement;
    const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
    const payload = {
      y: window.scrollY,
      progress: Math.min(1, window.scrollY / maxScroll),
      targetPath: getPath(targetUrl),
      ts: Date.now(),
    };
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify(payload));
  };

  const restoreScrollIfNeeded = () => {
    const raw = sessionStorage.getItem(SCROLL_KEY);
    if (!raw) return;

    let saved;
    try {
      saved = JSON.parse(raw);
    } catch (_) {
      sessionStorage.removeItem(SCROLL_KEY);
      return;
    }

    const currentPath = window.location.pathname;
    const isFresh = Date.now() - (saved.ts || 0) < 15000;
    if (!isFresh || saved.targetPath !== currentPath) {
      sessionStorage.removeItem(SCROLL_KEY);
      return;
    }

    const restore = () => {
      const doc = document.documentElement;
      const maxScroll = Math.max(0, doc.scrollHeight - window.innerHeight);
      const targetY =
        typeof saved.y === "number" && saved.y <= maxScroll
          ? saved.y
          : Math.round((saved.progress || 0) * maxScroll);
      window.scrollTo(0, Math.max(0, targetY));
    };

    requestAnimationFrame(() => {
      restore();
      setTimeout(restore, 80);
      setTimeout(() => {
        restore();
        sessionStorage.removeItem(SCROLL_KEY);
      }, 240);
    });
  };

  const currentLang = normalize(body.dataset.lang);
  const urls = {
    it: body.dataset.langItUrl || "",
    en: body.dataset.langEnUrl || "",
  };

  restoreScrollIfNeeded();

  document.querySelectorAll("[data-lang-switch]").forEach((link) => {
    link.addEventListener("click", () => {
      const chosen = link.dataset.langSwitch;
      if (supported.includes(chosen)) {
        localStorage.setItem(STORAGE_KEY, chosen);
        saveScrollForTarget(link.href);
      }
    });
  });

  const stored = localStorage.getItem(STORAGE_KEY);
  const browserLang = normalize(navigator.languages?.[0] || navigator.language || "it");
  const preferred = supported.includes(stored) ? stored : browserLang;

  if (preferred !== currentLang && urls[preferred]) {
    localStorage.setItem(STORAGE_KEY, preferred);
    saveScrollForTarget(urls[preferred]);
    window.location.replace(urls[preferred]);
  }
})();
