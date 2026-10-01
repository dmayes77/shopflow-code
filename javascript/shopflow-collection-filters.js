/* ShopFlow – Collection Filters v1.2.0
 * Behavior layer for the ShopFlow Collection Filters component (Storesynk-powered).
 * v1.2.0: tag sections. A filter group marked data-filter-sections splits its chips into labelled sections from Shopify tag
 *         prefixes ("Color: Orange" → section "Color", chip "Orange"). The prefix is never shown to shoppers: chips show only
 *         the part after the colon, the section heading is the humanised prefix. The chips' sf-filter-value stays the full tag,
 *         so Storesynk still matches Shopify. Chips stay inside the same Storesynk group, so filtering is unchanged.
 *         Tags without a colon stay in the group's own list. data-filter-sections-order="Color,Style" sets the section order.
 * v1.1.0: ≤991px the panel is a bottom sheet. Added: swipe down on the header closes it; aria-modal + Tab stays inside;
 *         Sort becomes chips (built from the native <select sf-sort>, which stays in the page and still drives Storesynk);
 *         only groups marked data-filter-collapsed can collapse on phones; "Clear all" is now labelled by the page ("Reset all").
 * v1.0.7: styles live in shopflow-collection-filters.css (loaded before the panel, so it never flashes open on phones);
 *         this script no longer carries or injects its own CSS.
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
  const mqPhone = matchMedia('(max-width: 991px)');
  // Shopify tag convention "Prefix: Value". The prefix only groups chips; it is never displayed on a chip.
  const PREFIX_RE = /^\s*([^:\n]{1,32}?)\s*:\s*(\S.*)$/;
  const humanise = t => t.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase());
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
      t.addEventListener('click', e => {
        e.preventDefault();
        if (mqPhone.matches && g.dataset.filterCollapsed !== 'true') return;   // phones: only Brand / Collection collapse
        set(g.classList.contains('is-collapsed'));
      });
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

    // Tag sections: "Color: Orange" → section "Color" with chip "Orange" (only for groups marked data-filter-sections)
    const sectionGroups = groups.filter(g => g.hasAttribute('data-filter-sections'));
    const sectionize = () => {
      sectionGroups.forEach(g => {
        const content = q(g, '.filter-group-content');
        if (!content) return;
        const baseList = q(content, '.filter-options');
        qa(g, '.filter-option[sf-filter-value]').forEach(v => {
          if (v.dataset.sfSec) return;
          v.dataset.sfSec = '1';
          const label = q(v, '.filter-option-label') || v;
          const m = (label.textContent || v.getAttribute('sf-filter-value') || '').trim().match(PREFIX_RE);
          if (!m) return;
          setText(label, m[2].trim());                                   // chip shows only the value
          const key = m[1].trim().toLowerCase();
          let sec = qa(content, '.filter-subgroup').find(x => x.dataset.sec === key);
          if (!sec) {
            sec = document.createElement('div');
            sec.className = 'filter-subgroup'; sec.dataset.sec = key;
            sec.setAttribute('role', 'group');
            const h = document.createElement('div');
            h.className = 'filter-subgroup-title'; h.textContent = humanise(m[1]); h.id = `${g.dataset.filterGroup || 'group'}-sec-${key.replace(/[^a-z0-9]+/g, '-')}`;
            sec.setAttribute('aria-labelledby', h.id);
            const l = document.createElement('div');
            l.className = baseList ? baseList.className : 'filter-options';
            sec.append(h, l); content.appendChild(sec);
          }
          sec.querySelector('.filter-options, :scope > div:last-child').appendChild(v);
        });
        // section order (attribute, then A→Z) and A→Z chips inside sections
        const order = (g.getAttribute('data-filter-sections-order') || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
        const secs = qa(content, '.filter-subgroup');
        const rankSec = x => { const i = order.indexOf(x.dataset.sec); return i < 0 ? 999 : i; };
        const sortedSecs = secs.slice().sort((a, b) => rankSec(a) - rankSec(b) || a.dataset.sec.localeCompare(b.dataset.sec));
        if (!sortedSecs.every((x, i) => x === secs[i])) sortedSecs.forEach(x => content.appendChild(x));
        secs.forEach(sec => {
          const list = sec.lastElementChild;
          const items = Array.from(list.children);
          const txt = el => (q(el, '.filter-option-label') || el).textContent.trim();
          const sorted = items.slice().sort((a, b) => txt(a).localeCompare(txt(b), undefined, { sensitivity: 'base' }));
          if (!sorted.every((x, i) => x === items[i])) sorted.forEach(x => list.appendChild(x));
        });
        // if every chip moved into a section, the group's own title would be a redundant heading: hide it
        const toggle = q(g, '[data-filter-toggle]');
        const leftovers = baseList ? qa(baseList, '.filter-option[sf-filter-value]').length : 0;
        if (toggle && secs.length && !leftovers) { setHidden(toggle, true); g.classList.remove('is-collapsed'); }
        g.classList.add('is-sectioned');
      });
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

    // Sort chips (phones): mirror the native <select sf-sort>; choosing a chip sets the select and fires its change event
    const sortSel = q(root, 'select[sf-sort]');
    const sortGroup = sortSel && sortSel.closest('.filter-group');
    let chips = null;
    if (sortSel && sortGroup && !q(sortGroup, '.sort-chips')) {
      chips = document.createElement('div');
      chips.className = 'sort-chips'; chips.setAttribute('role', 'radiogroup'); chips.setAttribute('aria-label', 'Sort by');
      qa(sortSel, 'option').forEach(o => {
        if (!o.value && !o.textContent.trim()) return;
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'sort-chip'; b.setAttribute('role', 'radio'); b.dataset.value = o.value; b.textContent = o.textContent.trim();
        b.addEventListener('click', () => {
          sortSel.value = o.value;
          sortSel.dispatchEvent(new Event('input', { bubbles: true }));
          sortSel.dispatchEvent(new Event('change', { bubbles: true }));
          syncSort();
        });
        chips.appendChild(b);
      });
      sortGroup.querySelector('.filter-group-content').appendChild(chips);
      sortGroup.classList.add('has-sort-chips');
      sortSel.addEventListener('change', () => syncSort());
    }
    function syncSort() {
      if (!chips) return;
      qa(chips, '.sort-chip').forEach(b => setAttr(b, 'aria-checked', String(b.dataset.value === sortSel.value)));
    }
    syncSort();

    // Bottom sheet: swipe down on the header closes it; Tab stays inside while open
    const panel = q(root, '.collection-filters-panel');
    if (panel) {
      panel.setAttribute('aria-modal', 'true');
      // swipe down on the header closes the sheet (self-contained: needs nothing from the Sheet engine)
      const head = q(panel, '.collection-filters-head');
      let sy = 0, dy = 0, t0 = 0, drag = false, pid = null;
      const canSwipe = () => mqPhone.matches && root.classList.contains('is-open');
      panel.addEventListener('pointerdown', e => {
        if (!canSwipe() || !head || !head.contains(e.target) || e.target.closest('a, button, [role="button"], input, select')) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        sy = e.clientY; dy = 0; t0 = e.timeStamp; drag = true; pid = e.pointerId;
        try { panel.setPointerCapture(pid); } catch (x) {}
      });
      panel.addEventListener('pointermove', e => {
        if (!drag || e.pointerId !== pid) return;
        dy = Math.max(0, e.clientY - sy);
        if (dy > 4) { panel.classList.add('is-dragging'); panel.style.transform = `translateY(${dy}px)`; }
      });
      const endDrag = e => {
        if (!drag || e.pointerId !== pid) return;
        drag = false;
        try { panel.releasePointerCapture(pid); } catch (x) {}
        const v = dy / Math.max(1, e.timeStamp - t0);
        panel.classList.remove('is-dragging');
        if (dy > Math.min(120, (panel.offsetHeight || 0) * 0.25) || (dy > 40 && v > 0.5)) {
          panel.style.transform = 'translateY(100%)'; close();
          setTimeout(() => { panel.style.transform = ''; }, 340);
        } else if (dy) panel.style.transform = '';
      };
      panel.addEventListener('pointerup', endDrag); panel.addEventListener('pointercancel', endDrag);
      panel.addEventListener('keydown', e => {
        if (e.key !== 'Tab' || !root.classList.contains('is-open')) return;
        const f = qa(panel, 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])').filter(el => el.getClientRects().length > 0);
        if (!f.length) return;
        const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      });
    }

    // Observe Storesynk's changes only; ignore the ones this script makes itself.
    const OBS = { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] };
    const LIST_OBS = { subtree: false, childList: true, attributes: true, attributeFilter: ['class', 'style'] };
    let timer = 0;
    const mo = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(run, 30); });
    const watch = () => { mo.observe(root, OBS); if (list) { mo.observe(list, LIST_OBS); qa(list, ':scope > *').forEach(el => mo.observe(el, { attributes: true, attributeFilter: ['class', 'style'] })); } };
    function run() {
      mo.disconnect();
      try { sectionize(); prepValues(); tidy(); refresh(); updateEmpty(); syncSort(); }
      finally { mo.takeRecords(); watch(); }
    }
    run();
  };

  const boot = () => { const roots = document.querySelectorAll('[data-collection-filters]'); roots.forEach(init); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();
