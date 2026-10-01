/* ShopFlow – Announcement bar + navbar stacking v1.0.0. Core 2.0 upstream candidate.
 * Installed in Page Shell › ShopFlow Core (dist/shopflow-core.js); styles in shopflow-announcement.css.
 * Sets --sf-announcement-offset on <html> = how much of the announcement bar is still on screen
 * (bar height − scroll, never below 0). The fixed navbar uses it as its `top`, so it stacks under the bar,
 * scrolls up with it, then sticks at the top. Works at every width (desktop navbar and mobile brand bar).
 */
(function(){
  if(window.ShopFlowAnnouncement) return;
  var root = document.documentElement, bar = null, height = 0, last = -1, ticking = false;

  function find(){
    var el = document.querySelector('[data-announcement]');
    if(!el) return null;
    // measure the whole CMS list wrapper the bar lives in (it is what takes up space in the flow)
    return el.closest('.w-dyn-list') || el;
  }
  function measure(){
    if(!bar || !bar.isConnected) bar = find();
    height = bar ? Math.max(0, bar.getBoundingClientRect().height) : 0;
    apply();
  }
  function apply(){
    ticking = false;
    var off = Math.max(0, Math.round(height - Math.max(0, window.scrollY || 0)));
    if(off === last) return;
    last = off;
    root.style.setProperty('--sf-announcement-offset', off + 'px');
  }
  function onScroll(){ if(!ticking){ ticking = true; requestAnimationFrame(apply); } }

  function init(){
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    window.addEventListener('load', measure);
    if(bar && window.ResizeObserver) new ResizeObserver(measure).observe(bar);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.ShopFlowAnnouncement = { version: '1.0.0', refresh: measure };
})();
