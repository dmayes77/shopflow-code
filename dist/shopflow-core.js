/* ShopFlow – shopflow-core.js – built from: shopflow-sheet.js core-bottom-nav.js core-consent.js shopflow-quick-add.js shopflow-size-labels.js */

/* ShopFlow – Sheet v1.2.0 – one shared drawer for the whole site. Core 2.0 upstream candidate (not commerce-specific).
   Installed in Page Shell › ShopFlow Core (dist/shopflow-core.js).

   ONE DRAWER, MANY CONTENTS
   The engine builds a single drawer (the "host", [data-sheet-host]) on every page. Anything the site wants to show in a
   drawer is a content block somewhere on the page, usually hidden:
       <div data-sheet="size-guide" data-sheet-mode="center" data-sheet-title="Size guide" class="is-hidden">
         [data-sheet-head]    optional – replaces the default head (title + ✕)
         [data-sheet-body]    optional – the content (if missing, the block's own children are used)
         [data-sheet-footer]  optional – sticky actions at the bottom
       </div>
   (data-sheet-content="name" works the same as data-sheet="name". Older full-sheet markup with overlay/panel wrappers
   still works: only its head/body/footer are used.)
   While open, those parts are moved into the host and go back to their place on close, so CMS bindings and Storesynk
   product context travel with them. The block's data-* attributes are mirrored onto the host (so CSS/JS written for
   [data-quick-add], [data-mobile-nav] … keeps working), plus data-sheet-view="name".

   Open:  any element with data-sheet-open="name", or ShopFlowSheet.open(nameOrBlock, {returnFocus})
          ShopFlowSheet.show({title, html|node, mode, width, view}) for content built in JS (no Webflow markup)
   Close: [data-sheet-close], overlay tap, Esc, or ShopFlowSheet.close()
   Modes: data-sheet-mode = auto (bottom sheet ≤991px, centered dialog above) | bottom | center | left | right
   Width: data-sheet-width="34rem" (or --sheet-width in CSS)
   Events on the block (and the host): "sheet:open", "sheet:close".
   Handles scroll lock, focus trap, focus return, injected ✕ button, reduced motion (CSS). */
(function(){
  if(window.ShopFlowSheet) return;
  var ANIM = 260, host, panel, defHead, defTitle, defBody, current = null, closeTimer = 0;
  var FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
  var X_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var SKIP = /^data-sheet(-content|-mode|-title|-width|-open)?$/;

  function esc(n){ return window.CSS && CSS.escape ? CSS.escape(n) : n; }
  function byName(n){ return document.querySelector('[data-sheet-content="' + esc(n) + '"], [data-sheet="' + esc(n) + '"]:not([data-sheet-host])'); }
  function nameOf(b){ return b.getAttribute('data-sheet-content') || b.getAttribute('data-sheet') || ''; }
  function fire(el, type){ try{ el && el.dispatchEvent(new CustomEvent(type, {bubbles:true})); }catch(e){} }
  function visible(el){ return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length); }
  function xButton(){ return '<button type="button" data-sheet-x aria-label="Close">' + X_SVG + '</button>'; }

  function build(){
    if(host) return;
    host = document.createElement('div');
    host.setAttribute('data-sheet', 'drawer'); host.setAttribute('data-sheet-host', '');
    host.innerHTML = '<div data-sheet-overlay data-sheet-close></div>' +
      '<div data-sheet-panel role="dialog" aria-modal="true" tabindex="-1">' +
        '<div data-sheet-head data-sheet-default><div data-sheet-grabber></div><div data-sheet-title id="sheet-host-title"></div><div data-sheet-close>' + xButton() + '</div></div>' +
        '<div data-sheet-body data-sheet-default></div>' +
      '</div>';
    panel = host.querySelector('[data-sheet-panel]');
    defHead = panel.children[0]; defTitle = defHead.querySelector('[data-sheet-title]'); defBody = panel.children[1];
    document.body.appendChild(host);
  }

  /* move a node into the host and remember where it came from */
  function borrow(node, before){
    var mark = document.createComment('sheet');
    node.parentNode.insertBefore(mark, node);
    panel.insertBefore(node, before || null);
    current.moved.push([node, mark]);
  }
  function part(block, sel){
    var list = block.querySelectorAll(sel);
    for(var i = 0; i < list.length; i++){ if(!list[i].closest('[data-sheet-host]')) return list[i]; }
    return null;
  }

  function mount(block, opts){
    current = { block: block, moved: [], attrs: [], node: opts.node || null, returnFocus: opts.returnFocus || document.activeElement };
    var name = block ? nameOf(block) : (opts.view || 'dynamic');
    host.setAttribute('data-sheet-view', name);
    host.setAttribute('data-sheet-mode', (block && block.getAttribute('data-sheet-mode')) || opts.mode || 'auto');
    var w = (block && block.getAttribute('data-sheet-width')) || opts.width;
    if(w) host.style.setProperty('--sheet-width', w); else host.style.removeProperty('--sheet-width');
    if(block){                                       // mirror the block's data-* attributes (CSS/JS hooks)
      Array.prototype.forEach.call(block.attributes, function(a){
        if(a.name.indexOf('data-') === 0 && !SKIP.test(a.name) && !host.hasAttribute(a.name)){ host.setAttribute(a.name, a.value); current.attrs.push(a.name); }
      });
    }
    var head = block && part(block, '[data-sheet-head]'), body = block && part(block, '[data-sheet-body]'), foot = block && part(block, '[data-sheet-footer]');
    var title = (block && block.getAttribute('data-sheet-title')) || opts.title || '';
    defTitle.textContent = title;
    if(head){ defHead.hidden = true; borrow(head, defHead); prepHead(head); } else defHead.hidden = false;
    defBody.innerHTML = '';
    if(body){ defBody.hidden = true; borrow(body, defBody); }
    else {
      defBody.hidden = false;
      if(block){ Array.prototype.slice.call(block.childNodes).forEach(function(n){ if(n !== foot && !(n.matches && n.matches('[data-sheet-overlay],[data-sheet-panel]'))) { var m = document.createComment('sheet'); block.insertBefore(m, n); defBody.appendChild(n); current.moved.push([n, m]); } }); }
      else if(opts.node){ defBody.appendChild(opts.node); }
      else if(opts.html){ defBody.innerHTML = opts.html; }
    }
    if(foot) borrow(foot, null);
    var t = panel.querySelector('[data-sheet-head]:not([hidden]) [data-sheet-title]');
    if(t){ if(!t.id) t.id = 'sheet-t-' + Math.random().toString(36).slice(2,8); panel.setAttribute('aria-labelledby', t.id); panel.removeAttribute('aria-label'); }
    else { panel.removeAttribute('aria-labelledby'); panel.setAttribute('aria-label', title || name.replace(/-/g,' ')); }
  }
  function prepHead(h){
    var x = h.querySelector('[data-sheet-close]');
    if(x && !x.querySelector('button, a')) x.innerHTML = xButton();
  }

  function unmount(){
    if(!current) return;
    current.moved.reverse().forEach(function(p){ var n = p[0], m = p[1]; if(m.parentNode){ m.parentNode.insertBefore(n, m); m.parentNode.removeChild(m); } });
    current.attrs.forEach(function(a){ host.removeAttribute(a); });
    host.className = '';                               // drop state classes a feature added (e.g. is-invalid)
    defHead.hidden = false; defBody.hidden = false; defBody.innerHTML = '';
    current = null;
  }

  function open(target, opts){
    opts = opts || {};
    build();
    var block = typeof target === 'string' ? byName(target) : target;
    if(block && block.closest && block.closest('[data-sheet-host]')) block = current && current.block;   // already inside the host
    if(!block && !opts.html && !opts.node) return null;
    if(current && current.block === block && host.classList.contains('is-open')) return host;
    if(current){ fire(current.block, 'sheet:close'); unmount(); }
    clearTimeout(closeTimer);
    mount(block, opts);
    host.classList.add('is-open');
    document.documentElement.classList.add('sheet-lock');
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ host.classList.add('is-visible'); }); });
    setTimeout(function(){
      var f = panel.querySelector('[data-sheet-autofocus]');
      if(!f){ var b = panel.querySelector('[data-sheet-body]:not([hidden])'); f = b && Array.prototype.find.call(b.querySelectorAll(FOCUSABLE), visible); }
      (f || panel).focus({preventScroll:true});
    }, 60);
    fire(block, 'sheet:open'); fire(host, 'sheet:open');
    return host;
  }
  function show(o){ o = o || {}; return open(null, o); }

  function close(target, opts){
    if(!host || !current || !host.classList.contains('is-open')) return;
    opts = opts || {};
    var block = current.block, r = current.returnFocus;
    host.classList.remove('is-visible');
    document.documentElement.classList.remove('sheet-lock');
    fire(block, 'sheet:close'); fire(host, 'sheet:close');
    var done = function(){ host.classList.remove('is-open'); unmount(); };
    if(opts.instant) done(); else closeTimer = setTimeout(done, ANIM);
    if(!opts.noFocus && r && r.focus && document.contains(r)) r.focus({preventScroll:true});
  }

  document.addEventListener('click', function(e){
    if(!e.target.closest) return;
    var t = e.target.closest('[data-sheet-open]');
    if(t){ e.preventDefault(); open(t.getAttribute('data-sheet-open'), {returnFocus:t}); return; }
    var c = e.target.closest('[data-sheet-close]');
    if(c && host && host.contains(c)){ e.preventDefault(); close(); }
  });
  document.addEventListener('keydown', function(e){
    if(!host || !host.classList.contains('is-open')) return;
    if(e.key === 'Escape'){ close(); return; }
    if(e.key === 'Tab'){
      var f = Array.prototype.filter.call(panel.querySelectorAll(FOCUSABLE), visible);
      if(!f.length){ e.preventDefault(); return; }
      var a = f[0], z = f[f.length-1];
      if(e.shiftKey && (document.activeElement === a || !panel.contains(document.activeElement))){ e.preventDefault(); z.focus(); }
      else if(!e.shiftKey && (document.activeElement === z || !panel.contains(document.activeElement))){ e.preventDefault(); a.focus(); }
    }
  });
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();

  window.ShopFlowSheet = {
    open: open, show: show, close: close,
    top: function(){ return host && host.classList.contains('is-open') ? host : null; },
    current: function(){ return current ? current.block : null; },
    host: function(){ build(); return host; }
  };
})();

/* Core – Bottom Nav v1.0.0 – behavior for Navigation / Bottom Nav + Navigation / Bottom Nav Tab.
   Core 2.0 (not commerce-specific). Works with the Sheet engine (window.ShopFlowSheet today, window.CoreSheet later).

   Markup contract (built by the Webflow components):
     [data-bottom-nav]                       outer spacer (reserves height so content is never covered)
       nav.bottom-nav_bar
         [data-bottom-nav-tab][data-tab-action="…"]   one per tab (Action prop)
           a[data-bottom-nav-link]                     full-tab hit area (Link prop = no-JS fallback)
           .bottom-nav_badge                           optional, in the Badge slot

   Tab actions (Action prop):
     ""                    normal link (active when the current page matches)
     "sheet:NAME"          opens the sheet [data-sheet="NAME"]
     "click:SELECTOR"      clicks an existing control, e.g. click:[sf-cart-open]
   Badges whose text is empty or 0 get .is-empty (hidden); the tab's accessible name includes the count. */
(function(){
  if(window.__coreBottomNav) return; window.__coreBottomNav = true;
  var TAB = '[data-bottom-nav-tab]', LINK = '[data-bottom-nav-link]';
  function sheetApi(){ return window.CoreSheet || window.ShopFlowSheet || null; }
  function norm(p){ p = (p || '/').replace(/\/+$/, ''); return p || '/'; }

  document.addEventListener('click', function(e){
    var link = e.target.closest && e.target.closest(LINK);
    if(!link) return;
    var tab = link.closest(TAB), action = tab && (tab.getAttribute('data-tab-action') || '').trim();
    if(!action) return;                                   // plain link: let it navigate
    var i = action.indexOf(':'), kind = action.slice(0, i), arg = action.slice(i + 1).trim();
    if(kind === 'sheet' && sheetApi()){
      e.preventDefault(); sheetApi().open(arg, {returnFocus: link});
    } else if(kind === 'click'){
      var target = null; try{ target = document.querySelector(arg); }catch(err){}
      if(target){ e.preventDefault(); target.click(); }     // missing target: fall back to the link
    }
  });

  function markActive(){
    var here = norm(location.pathname);
    document.querySelectorAll(TAB).forEach(function(tab){
      var link = tab.querySelector(LINK), action = (tab.getAttribute('data-tab-action') || '').trim(), on = false;
      if(link && !action){
        var a = document.createElement('a'); a.href = link.getAttribute('href') || '/';
        if(a.origin === location.origin){ var p = norm(a.pathname); on = p === '/' ? here === '/' : (here === p || here.indexOf(p + '/') === 0); }
      }
      tab.classList.toggle('is-active', on);
      if(link){ if(on) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); }
      if(link && action.indexOf('sheet:') === 0) link.setAttribute('aria-haspopup', 'dialog');
    });
  }

  function syncBadges(){
    document.querySelectorAll(TAB).forEach(function(tab){
      var b = tab.querySelector('.bottom-nav_badge'), link = tab.querySelector(LINK);
      if(!b || !link) return;
      var n = (b.textContent || '').trim(), empty = n === '' || n === '0';
      if(b.classList.contains('is-empty') !== empty) b.classList.toggle('is-empty', empty);
      var base = link.getAttribute('data-label') || link.getAttribute('aria-label') || '';
      if(!link.hasAttribute('data-label')) link.setAttribute('data-label', base);
      var name = empty ? base : base + ', ' + n + (n === '1' ? ' item' : ' items');
      if(link.getAttribute('aria-label') !== name) link.setAttribute('aria-label', name);
    });
  }

  function init(){
    markActive(); syncBadges();
    var t = 0, mo = new MutationObserver(function(){ clearTimeout(t); t = setTimeout(syncBadges, 30); });
    document.querySelectorAll('[data-bottom-nav] .bottom-nav_badge').forEach(function(b){
      mo.observe(b, {childList:true, characterData:true, subtree:true});
    });
    document.documentElement.classList.toggle('has-bottom-nav', !!document.querySelector('[data-bottom-nav]'));
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

/* Core – Consent v1.0.0 – cookie consent + the Site Settings sheet. Core 2.0 (not commerce-specific).
   Uses the Sheet engine (window.CoreSheet / window.ShopFlowSheet). Pairs with the head snippet (Consent Mode v2 defaults),
   which must run BEFORE the Google tag. Categories: essential (always on), analytics, marketing.

   Markup (Webflow component "Core / Site Settings", placed in the Page Shell Overlay slot):
     [data-sheet="site-settings"]  the settings sheet (cog opens it). Sections: [data-settings-section] (privacy now, appearance later)
       [data-consent-switch="analytics|marketing|essential"]   role="switch" buttons
     [data-sheet="cookie-notice"]  first-visit notice
     [data-consent-action="accept-all|necessary|save|customize"]
   Opening: any [data-sheet-open="site-settings"] (the brand-bar cog) or CoreConsent.open().
   Deferred third-party scripts: <script type="text/plain" data-consent="analytics|marketing" src|inline> run once consent is given.
   Events: "core:consent" on document (detail = {analytics, marketing}). */
(function(){
  if(window.CoreConsent) return;
  var KEY = 'core-consent-v1', CATS = ['analytics','marketing'];
  function sheet(){ return window.CoreSheet || window.ShopFlowSheet || null; }
  function read(){ try{ return JSON.parse(localStorage.getItem(KEY)) || null; }catch(e){ return null; } }
  function write(s){ try{ localStorage.setItem(KEY, JSON.stringify(s)); }catch(e){} }
  function g(v){ return v ? 'granted' : 'denied'; }

  function apply(s){
    if(typeof window.gtag === 'function'){
      window.gtag('consent', 'update', { analytics_storage: g(s.analytics), ad_storage: g(s.marketing), ad_user_data: g(s.marketing), ad_personalization: g(s.marketing) });
    }
    document.querySelectorAll('script[type="text/plain"][data-consent]').forEach(function(old){
      if(!s[old.getAttribute('data-consent')] || old.hasAttribute('data-consent-ran')) return;
      old.setAttribute('data-consent-ran', '');
      var n = document.createElement('script');
      Array.prototype.forEach.call(old.attributes, function(a){ if(a.name !== 'type' && a.name.indexOf('data-consent') !== 0) n.setAttribute(a.name, a.value); });
      if(!old.src) n.text = old.text;
      old.parentNode.insertBefore(n, old.nextSibling);
    });
    try{ document.dispatchEvent(new CustomEvent('core:consent', {detail: {analytics: !!s.analytics, marketing: !!s.marketing}})); }catch(e){}
  }

  function sync(s){
    s = s || read() || {};
    document.querySelectorAll('[data-consent-switch]').forEach(function(sw){
      var c = sw.getAttribute('data-consent-switch'), on = c === 'essential' ? true : !!s[c];
      sw.setAttribute('role', 'switch'); if(sw.tagName === 'BUTTON') sw.type = 'button'; else if(!sw.hasAttribute('tabindex')) sw.setAttribute('tabindex', '0');
      sw.setAttribute('aria-checked', on ? 'true' : 'false');
      if(c === 'essential') sw.setAttribute('aria-disabled', 'true');
    });
  }
  function fromSwitches(){
    var s = {};
    CATS.forEach(function(c){ var sw = document.querySelector('[data-consent-switch="' + c + '"]'); s[c] = !!sw && sw.getAttribute('aria-checked') === 'true'; });
    return s;
  }
  function set(s){
    s = { analytics: !!s.analytics, marketing: !!s.marketing, v: 1, ts: new Date().toISOString() };
    write(s); sync(s); apply(s);
    if(sheet()) sheet().close();
    return s;
  }
  function open(){ sync(); if(sheet()) sheet().open('site-settings'); }

  document.addEventListener('click', function(e){
    if(!e.target.closest) return;
    var sw = e.target.closest('[data-consent-switch]');
    if(sw){
      e.preventDefault();
      if(sw.getAttribute('aria-disabled') === 'true') return;
      sw.setAttribute('aria-checked', sw.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
      return;
    }
    var b = e.target.closest('[data-consent-action]');
    if(!b) return;
    e.preventDefault();
    var a = b.getAttribute('data-consent-action');
    if(a === 'accept-all') set({analytics: true, marketing: true});
    else if(a === 'necessary') set({analytics: false, marketing: false});
    else if(a === 'save') set(fromSwitches());
    else if(a === 'customize'){ if(sheet()) sheet().close(null, {instant: true, noFocus: true}); setTimeout(open, 30); }
  });
  document.addEventListener('sheet:open', function(){ sync(); });
  /* Webflow renders these as div/link elements: make them real controls for keyboard and screen readers */
  function prepActions(){
    document.querySelectorAll('[data-consent-action]').forEach(function(b){
      if(b.tagName === 'BUTTON'){ b.type = 'button'; return; }
      b.setAttribute('role', 'button'); if(!b.hasAttribute('tabindex')) b.setAttribute('tabindex', '0'); b.removeAttribute('href');
    });
  }
  document.addEventListener('keydown', function(e){
    if((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-consent-switch]:not(button),[data-consent-action]:not(button)')){ e.preventDefault(); e.target.click(); }
  });

  function init(){
    var s = read();
    prepActions(); sync(s);
    if(s) apply(s);
    else if(document.querySelector('[data-sheet="cookie-notice"]')){
      setTimeout(function(){ if(!read() && sheet() && !sheet().top()) sheet().open('cookie-notice'); }, 1200);
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.CoreConsent = { get: read, set: set, open: open };
})();

/* ShopFlow – Quick Add v1.1.1 – product size picker shown in the shared ShopFlow drawer (Sheet v1.2.0).
   Installed in Page Shell › embed "ShopFlow Core Code" (section 2).
   Card "Add to cart" / "+" on a product with 2+ sizes opens the [data-quick-add] sheet that sits next to the card in the
   same collection item (it carries its own sf-product context). One-size products add straight to cart.
   Storesynk handles variant selection (sf-change-option / sf-option-value) and cart (sf-add-to-cart / sf-buy-now). */
(function(){
  if(window.__sfQuickAdd) return; window.__sfQuickAdd = true;
  var CARD_BTN = '.product-card-actions button, .product-card-actions [sf-add-to-cart]';

  function sheetFor(btn){
    var item = btn.closest('.w-dyn-item, [role="listitem"]');
    if(!item) return null;
    if(!item.__sfSheet) item.__sfSheet = item.querySelector('[data-quick-add]');
    return item.__sfSheet;
  }
  function options(s){ return s.querySelectorAll('[data-quick-add-sizes] [sf-option-value]'); }
  function selected(s){ return s.querySelector('[data-quick-add-sizes] [sf-option-value].is-selected'); }
  function setLabel(s, txt){ var l = s.querySelector('[data-quick-add-selected]'); if(l) l.textContent = txt; }
  function refresh(s){
    var sel = selected(s);
    s.classList.remove('is-invalid');
    setLabel(s, sel ? (sel.getAttribute('sf-option-value') || sel.textContent.trim()) : 'Select');
    s.querySelectorAll('[data-sheet-footer] .button').forEach(function(b){ b.classList.toggle('is-waiting', !sel); });
  }
  function prep(s){
    if(s.__qaReady) return; s.__qaReady = true;
    var list = s.querySelector('[data-quick-add-sizes]');
    if(list) list.setAttribute('role','radiogroup');
    options(s).forEach(function(o){ o.setAttribute('role','radio'); o.setAttribute('tabindex','0'); o.setAttribute('aria-checked','false'); });
  }
  function reset(s){
    options(s).forEach(function(o){ o.classList.remove('is-selected'); o.setAttribute('aria-checked','false'); });
    refresh(s);
  }

  /* 1. Intercept the card button before Storesynk sees it (capture phase). */
  document.addEventListener('click', function(e){
    var btn = e.target.closest && e.target.closest(CARD_BTN);
    if(!btn || btn.closest('[data-quick-add]') || !window.ShopFlowSheet) return;
    var s = sheetFor(btn);
    if(!s) return;
    prep(s);
    if(options(s).length < 2) return;            // one size: let Storesynk add it
    e.preventDefault(); e.stopImmediatePropagation();
    reset(s);
    ShopFlowSheet.open(s, {returnFocus: btn});
  }, true);

  /* 2. Inside the sheet: size pick and the "choose a size first" gate. */
  document.addEventListener('click', function(e){
    var s = e.target.closest && e.target.closest('[data-quick-add]');
    if(!s) return;
    var opt = e.target.closest('[data-quick-add-sizes] [sf-option-value]');
    if(opt){
      options(s).forEach(function(o){ var on = o === opt; o.classList.toggle('is-selected', on); o.setAttribute('aria-checked', on ? 'true' : 'false'); });
      refresh(s); return;                         // Storesynk also receives this click and switches the variant
    }
    var act = e.target.closest('[data-sheet-footer] [sf-add-to-cart], [data-sheet-footer] [sf-buy-now]');
    if(act){
      if(options(s).length > 1 && !selected(s)){
        e.preventDefault(); e.stopImmediatePropagation();
        s.classList.add('is-invalid'); setLabel(s, 'Please select a size');
        var f = options(s)[0]; f && f.focus({preventScroll:true});
        return;
      }
      setTimeout(function(){ ShopFlowSheet.close(s, {instant:true, noFocus:true}); }, 150); // Storesynk opens the cart / checkout
    }
  }, true);

  document.addEventListener('keydown', function(e){
    if((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-quick-add-sizes] [sf-option-value]')){ e.preventDefault(); e.target.click(); }
  });
})();

/* ShopFlow – Size Labels v1.0.0 – every size button on the site shows S / M / L… in a rounded square.
   Installed in Page Shell › ShopFlow Core (dist/shopflow-core.js). Applies to any Storesynk option value
   ([sf-option-value]) that contains a .pill-button: product page, Quick Add, and anything added later.
   Shopify keeps the full size names; the full name stays in the button text (read by screen readers), the tooltip,
   the "Size: Medium" label and the cart. Storesynk fills option values after load, so a MutationObserver re-applies. */
(function(){
  if(window.__sfSizeLabels) return; window.__sfSizeLabels = true;
  var SHORT = {'xx-small':'XXS','x-small':'XS','extra small':'XS','small':'S','medium':'M','large':'L','x-large':'XL','extra large':'XL','xx-large':'XXL','2x-large':'2XL','xxx-large':'3XL','3x-large':'3XL'};
  function apply(){
    document.querySelectorAll('[sf-option-value]').forEach(function(item){
      var pill = item.querySelector('.pill-button'); if(!pill) return;
      var v = (item.getAttribute('sf-option-value') || pill.textContent || '').trim(), s = SHORT[v.toLowerCase()];
      if(v && item.getAttribute('title') !== v) item.setAttribute('title', v);
      if(s){ if(pill.getAttribute('data-short') !== s) pill.setAttribute('data-short', s); }
      else if(pill.hasAttribute('data-short')) pill.removeAttribute('data-short');
    });
  }
  var t = 0, mo = new MutationObserver(function(){ clearTimeout(t); t = setTimeout(function(){ mo.disconnect(); try{ apply(); } finally { watch(); } }, 40); });
  function watch(){ mo.observe(document.body, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['sf-option-value']}); }
  function init(){ apply(); watch(); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
