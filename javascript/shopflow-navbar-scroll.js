/* ShopFlow – Navbar scroll state v2.0.1
 * Source of truth for the script registered in Webflow as "shopflownavbarscroll" and
 * loaded from the site footer custom code.
 *
 * Adds .navbar-compact-scrolled to every .navbar-compact once the page has scrolled
 * past 64px (the glass/blur look is styled on that combo class in Webflow).
 * Replaces the v1 GSAP/ScrollTrigger embed – no GSAP needed for a class toggle.
 * Passive scroll listener; the class is only touched when the 64px threshold is crossed.
 * Upstream candidate: this behavior is not commerce-specific (Core Design System 2.0).
 */
(() => {
  const OFFSET = 64;
  const init = () => {
    const navs = document.querySelectorAll('.navbar-compact');
    if (!navs.length) return;
    let state = null;
    const update = () => {
      const scrolled = window.scrollY > OFFSET;
      if (scrolled === state) return;
      state = scrolled;
      navs.forEach(n => n.classList.toggle('navbar-compact-scrolled', scrolled));
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
