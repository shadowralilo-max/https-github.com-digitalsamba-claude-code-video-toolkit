// Wires branding + links for the standalone Bag Chase site.
(function () {
  const cfg = window.BAGCHASE_CONFIG;

  function init() {
    document.querySelectorAll("[data-ticker]").forEach((el) => (el.textContent = cfg.TOKEN.ticker));
    document.querySelectorAll("[data-token-name]").forEach((el) => (el.textContent = cfg.TOKEN.name));

    const linkMap = {
      "link-main-site": cfg.LINKS.mainSite,
      "link-main-site-footer": cfg.LINKS.mainSite,
      "link-x": cfg.LINKS.x,
      "link-telegram": cfg.LINKS.telegram,
      "link-buy": cfg.LINKS.buy,
    };
    Object.entries(linkMap).forEach(([id, url]) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (url) {
        el.href = url;
        el.classList.remove("disabled");
        el.removeAttribute("aria-disabled");
      } else {
        el.setAttribute("aria-disabled", "true");
        el.classList.add("disabled");
        el.addEventListener("click", (e) => e.preventDefault());
      }
    });

    const menuToggle = document.getElementById("menu-toggle");
    const navLinks = document.getElementById("nav-links");
    menuToggle?.addEventListener("click", () => navLinks.classList.toggle("open"));
  }

  document.addEventListener("DOMContentLoaded", init);
})();
