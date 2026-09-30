/* ShopFlow – Collection Filters v1.0.4
 * Behavior layer for the ShopFlow Collection Filters component (Storesynk-powered).
 * Storesynk does the actual filtering (sf-filter / sf-option-filter / sf-filter-value /
 * sf-filter-reset, active class .sf-active). This script only adds UX:
 *  - collapsible groups (start collapsed with data-filter-collapsed="true")
 *  - mobile drawer: open [data-filters-open], close [data-filters-close], Esc, scroll lock
 *  - per-group + total active counts, "Clear all" [data-filters-clear]
 *  - option filters (e.g. Size): de-duplicates values (Storesynk's Product Options CMS
 *    has one item per product) and ignores Shopify's "Default Title"
 *  - hides groups that have no usable values
 *  - injects the state/drawer CSS (checked boxes, collapsed groups, mobile drawer ≤991px)
 *  Option values need data-option-group bound to Product Options › Option Group Name.
 * v1.0.1: fixes a render loop (v1.0.0 re-wrote counts on every mutation it caused).
 *   Writes only when a value changes, pauses its observer while writing, debounces runs.
 * v1.0.2: hidden rows really hide (Webflow's display:flex beat [hidden]); no greyed-out
 *   options (Storesynk marks every value sf-filter-unavailable); groups with fewer than
 *   2 choices hide (unless one is active); size values sort S→XXL / One Size; desktop
 *   sticky panel scrolls when taller than the viewport; "no products match" empty state
 *   after the product list (message + Clear filters), shown when every card is filtered out.
 * v1.0.3: the empty state is a native Webflow element [data-filters-empty] (after the
 *   product list, inside the same [sf-collection]) so it can be styled and reworded in the
 *   Designer. Hidden until needed via .is-active; its [data-filters-clear] clears all.
 *   Falls back to creating one if the page has none. Put this in the embed's <style> too
 *   so it never flashes on load:  [data-filters-empty]:not(.is-active){display:none}
 * v1.0.4: [data-filters-clear] can wrap a Core 2.0 Button component (e.g. Button /
 *   Standard Flat); the wrapper catches the click and cancels the link's navigation.
 * Markup contract: root [data-collection-filters] > .filter-group > [data-filter-toggle]
 * + .filter-group-content; option rows are .filter-option[sf-filter-value].
 */
(() => {
  const ACTIVE = 'sf-active';
  const q = (el, s) => el.querySelector(s);
  const qa = (el, s) => Array.from(el.querySelectorAll(s));
  // change-guarded writes (never touch the DOM when the value is already correct)
  const setText = (el, v) => { if (el && el.textContent !== v) el.textContent = v; };
  const setAttr = (el, n, v) => { if (el.getAttribute(n) !== v) el.setAttribute(n, v); };
  const setHidden = (el, v) => { if (el.hidden !== v) el.hidden = v; };
  const setClass = (el, c, on) => { if (el.classList.contains(c) !== on) el.classList.toggle(c, on); };
  const asButton = el => {
    if (el.tagName === 'BUTTON') return;
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.removeAttribute('href');
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
    });
  };

  // [data-filters-clear] may sit on a wrapper around a Core Button component (whose link
  // overlay is the real control): only turn it into a button when it has no control inside.
  const asAction = (el, fn) => {
    if (!el.querySelector('a, button')) asButton(el);
    el.addEventListener('click', e => { e.preventDefault(); fn(); });
  };

  // State + drawer styles (base styles live on the Webflow classes; these depend on
  // runtime classes: Storesynk's .sf-active / .sf-filter-unavailable, and is-open / is-collapsed)
  const CSS = `
.collection-filters .w-dyn-empty{display:none}
.collection-filters [hidden]{display:none!important}
[data-filters-empty]:not(.is-active){display:none!important}
.filter-option{user-select:none}
.filter-option:hover .filter-option-box{border-color:var(--_theme---text--primary)}
.filter-option.sf-active .filter-option-box{background-color:var(--_theme---action--primary);border-color:var(--_theme---action--primary)}
.filter-option.sf-active .filter-option-box::after{content:"";position:absolute;left:50%;top:45%;width:.3rem;height:.55rem;border:solid var(--_theme---action--primary-text);border-width:0 2px 2px 0;transform:translate(-50%,-50%) rotate(45deg)}
.filter-option:focus-visible,.filter-group-toggle:focus-visible,.collection-filters-trigger:focus-visible,.collection-filters-clear:focus-visible,.collection-filters-close:focus-visible,.collection-filters-apply:focus-visible{outline:2px solid var(--_theme---focus--ring);outline-offset:2px}
.filter-group.is-collapsed .filter-group-content{display:none}
.filter-group.is-collapsed .filter-group-chevron{transform:rotate(45deg)}
.filter-group[hidden]{display:none}
.collection-filters-clear{visibility:hidden}
.collection-filters.has-active-filters .collection-filters-clear{visibility:visible}
@media (min-width:992px){
.collection-filters{max-height:calc(100vh - 96px - 1rem);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}
}
@media (max-width:991px){
.collection-filters{position:static;flex:none;width:100%}
.collection-filters-trigger{display:inline-flex}
.collection-filters-overlay{display:block;position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.4);opacity:0;pointer-events:none;transition:opacity .25s ease}
.collection-filters-panel{position:fixed;top:0;bottom:0;left:0;z-index:2001;width:min(22rem,88vw);padding:0 1.25rem;background-color:var(--_theme---background--primary);box-shadow:0 0 2rem rgba(0,0,0,.15);transform:translateX(-100%);visibility:hidden;transition:transform .25s ease,visibility 0s linear .25s}
.collection-filters.is-open .collection-filters-panel{transform:none;visibility:visible;transition:transform .25s ease}
.collection-filters.is-open .collection-filters-overlay{opacity:1;pointer-events:auto}
.collection-filters-head{display:flex}
.collection-filters-body{flex:1 1 auto;overflow-y:auto;overscroll-behavior:contain}
.collection-filters-foot{padding-bottom:1rem;border-top:1px solid var(--_theme---border--subtle)}
.collection-filters-apply{display:inline-flex}
html.filters-open{overflow:hidden}
}
@media (prefers-reduced-motion:reduce){.collection-filters-panel,.collection-filters-overlay,.filter-group-chevron{transition:none!important}}`;
  const injectCSS = () => {
    if (document.getElementById('shopflow-collection-filters-css')) return;
    const st = document.createElement('style');
    st.id = 'shopflow-collection-filters-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  };

  const init = root => {
    if (root.dataset.sfInit) return;
    root.dataset.sfInit = '1';
    const groups = qa(root, '.filter-group');
    const openBtn = q(root, '[data-filters-open]');

    // Groups: collapse state + a11y
    groups.forEach((g, i) => {
      const t = q(g, '[data-filter-toggle]');
      const c = q(g, '.filter-group-content');
      if (!t || !c) return;
      asButton(t);
      c.id = c.id || `filter-group-${i}`;
      t.setAttribute('aria-controls', c.id);
      const set = open => { g.classList.toggle('is-collapsed', !open); t.setAttribute('aria-expanded', String(open)); };
      set(g.dataset.filterCollapsed !== 'true');
      t.addEventListener('click', e => { e.preventDefault(); set(g.classList.contains('is-collapsed')); });
    });

    // Filter values behave like checkboxes for keyboard / screen readers
    const prepValues = () => qa(root, '.filter-option[sf-filter-value]').forEach(v => {
      if (v.dataset.sfA11y) return;
      v.dataset.sfA11y = '1';
      v.setAttribute('role', 'checkbox');
      v.setAttribute('tabindex', '0');
      v.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); v.click(); }
      });
    });

    // Size-like values sort in shopping order; anything unknown keeps its place after them
    const SIZE_ORDER = ['xxs','xs','s','small','m','medium','l','large','xl','x-large','xxl','2xl','xx-large','3xl','one size','os'];
    const rank = v => { const i = SIZE_ORDER.indexOf((v.getAttribute('sf-filter-value') || '').trim().toLowerCase()); return i < 0 ? 999 : i; };
    const sortOptions = g => {
      const items = qa(g, '[sf-filter-value]').map(v => v.closest('.w-dyn-item')).filter(Boolean);
      if (items.length < 2) return;
      const parent = items[0].parentElement;
      const sorted = items.slice().sort((a, b) => rank(q(a, '[sf-filter-value]') || a) - rank(q(b, '[sf-filter-value]') || b));
      if (sorted.every((el, i) => el === items[i])) return;          // already in order: no DOM write
      sorted.forEach(el => parent.appendChild(el));
    };

    // Option filters: de-dupe values, drop "Default Title", hide groups with < 2 choices
    const tidy = () => {
      groups.forEach(g => {
        const seen = new Set();
        const optName = (g.getAttribute('sf-option-filter') || '').trim().toLowerCase();
        if (optName) sortOptions(g);
        qa(g, '[sf-filter-value]').forEach(v => {
          const key = (v.getAttribute('sf-filter-value') || '').trim().toLowerCase();
          const item = v.closest('.w-dyn-item') || v;
          const grp = (v.getAttribute('data-option-group') || '').trim().toLowerCase();
          const wrongGroup = optName && grp && grp !== optName;
          const dupe = !key || key === 'default title' || wrongGroup || seen.has(key);
          setHidden(item, dupe);
          if (!dupe) seen.add(key);
        });
        if (g.dataset.filterGroup === 'sort') return;
        const hasActive = !!q(g, `.filter-option.${ACTIVE}`);
        setHidden(g, seen.size < 2 && !hasActive);
      });
    };

    // Counts + clear-all visibility
    const refresh = () => {
      let total = 0;
      groups.forEach(g => {
        const n = qa(g, `.filter-option.${ACTIVE}`).length;
        total += n;
        const c = q(g, '[data-filter-count]');
        setText(c, n ? `(${n})` : '');
        qa(g, '.filter-option[sf-filter-value]').forEach(v => setAttr(v, 'aria-checked', String(v.classList.contains(ACTIVE))));
      });
      const t = q(root, '[data-filters-total]');
      setText(t, total ? `(${total})` : '');
      setClass(root, 'has-active-filters', total > 0);
    };

    // Clear all → click every Storesynk reset inside the component
    const clearAll = () => qa(root, '[sf-filter-reset]').forEach(r => r.click());
    qa(root, '[data-filters-clear]').forEach(b => asAction(b, clearAll));

    // Empty state: native element [data-filters-empty] in the same [sf-collection]
    // (Storesynk hides non-matching cards; show the message when none are left)
    const scope = root.closest('[sf-collection]');
    const list = scope?.querySelector('[sf-list]');
    let empty = scope?.querySelector('[data-filters-empty]') || null;
    if (list && !empty) {                       // fallback for pages without the element
      empty = document.createElement('div');
      empty.className = 'collection-filters-empty';
      empty.setAttribute('data-filters-empty', '');
      empty.setAttribute('role', 'status');
      empty.innerHTML = '<h3 class="heading-h4">No products match those filters</h3>' +
        '<p class="text-body text-secondary">Try removing a filter or clearing them all.</p>' +
        '<button type="button" class="button is-flat" data-filters-clear>Clear filters</button>';
      (list.closest('.w-dyn-list') || list).after(empty);
    }
    if (empty) qa(empty, '[data-filters-clear]').forEach(b => asAction(b, clearAll));
    const updateEmpty = () => {
      if (!empty || !list) return;
      const shown = Array.from(list.children).some(el => el.getClientRects().length > 0);
      setClass(empty, 'is-active', !shown && (list.children.length > 0 || root.classList.contains('has-active-filters')));
    };

    // Mobile drawer
    const open = () => {
      root.classList.add('is-open');
      document.documentElement.classList.add('filters-open');
      if (openBtn) openBtn.setAttribute('aria-expanded', 'true');
      const first = q(root, '.collection-filters-panel [data-filters-close], .collection-filters-panel [data-filter-toggle]');
      if (first) first.focus();
    };
    const close = () => {
      if (!root.classList.contains('is-open')) return;
      root.classList.remove('is-open');
      document.documentElement.classList.remove('filters-open');
      if (openBtn) { openBtn.setAttribute('aria-expanded', 'false'); openBtn.focus(); }
    };
    if (openBtn) { asButton(openBtn); openBtn.addEventListener('click', e => { e.preventDefault(); open(); }); }
    qa(root, '[data-filters-close]').forEach(b => {
      if (!b.classList.contains('collection-filters-overlay')) asButton(b);
      b.addEventListener('click', e => { e.preventDefault(); close(); });
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    matchMedia('(min-width: 992px)').addEventListener('change', e => { if (e.matches) close(); });

    // Observe Storesynk's changes only; ignore the ones this script makes itself.
    const OBS = { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] };
    const LIST_OBS = { subtree: false, childList: true, attributes: true, attributeFilter: ['class', 'style'] };
    let timer = 0;
    const mo = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(run, 30); });
    const watch = () => { mo.observe(root, OBS); if (list) { mo.observe(list, LIST_OBS); qa(list, ':scope > *').forEach(el => mo.observe(el, { attributes: true, attributeFilter: ['class', 'style'] })); } };
    function run() {
      mo.disconnect();
      try { prepValues(); tidy(); refresh(); updateEmpty(); }
      finally { mo.takeRecords(); watch(); }
    }
    run();
  };

  const boot = () => { const roots = document.querySelectorAll('[data-collection-filters]'); if (roots.length) injectCSS(); roots.forEach(init); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();
