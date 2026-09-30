/* ShopFlow – shopflow-core.js – built from: shopflow-sheet.js shopflow-quick-add.js */

/* ShopFlow – Sheet v1.1.0 – generic bottom sheet / dialog / left drawer behavior. Core 2.0 upstream candidate.
   Installed in Page Shell › embed "ShopFlow Core Code" (section 1).
   Open:  any element with data-sheet-open="name"  → opens [data-sheet="name"]
          or JS: ShopFlowSheet.open(elementOrName, {returnFocus})
   Close: [data-sheet-close] inside the sheet, overlay tap, Esc, or ShopFlowSheet.close(el, {instant, noFocus})
   Events on the sheet element: "sheet:open", "sheet:close".
   Handles: move to <body> (escapes transformed parents), scroll lock, focus trap, focus return, injected X button. */
(function(){
  if(window.ShopFlowSheet) return;
  var stack = [], ANIM = 260;
  var FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
  var X_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function byName(n){ return document.querySelector('[data-sheet="' + (window.CSS && CSS.escape ? CSS.escape(n) : n) + '"]'); }
  function fire(s, type){ try{ s.dispatchEvent(new CustomEvent(type, {bubbles:true})); }catch(e){} }
  function visible(el){ return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length); }

  function prep(s){
    if(s.__sheetReady) return; s.__sheetReady = true;
    var x = s.querySelector('[data-sheet-head] [data-sheet-close]');
    if(x && !x.querySelector('button, a')) x.innerHTML = '<button type="button" data-sheet-x aria-label="Close">' + X_SVG + '</button>';
    var p = s.querySelector('[data-sheet-panel]');
    if(p){
      if(!p.hasAttribute('role')) p.setAttribute('role','dialog');
      p.setAttribute('aria-modal','true'); p.setAttribute('tabindex','-1');
      var t = s.querySelector('[data-sheet-title]');
      if(t && !p.hasAttribute('aria-labelledby')){ if(!t.id) t.id = 'sheet-' + Math.random().toString(36).slice(2,8); p.setAttribute('aria-labelledby', t.id); }
    }
  }

  function open(s, opts){
    if(typeof s === 'string') s = byName(s);
    if(!s) return null;
    opts = opts || {};
    prep(s);
    if(s.classList.contains('is-open')) return s;
    if(s.parentNode !== document.body){ s.__sheetHome = s.parentNode; document.body.appendChild(s); }
    s.__sheetReturn = opts.returnFocus || document.activeElement;
    clearTimeout(s.__sheetTimer);
    stack.push(s);
    s.classList.add('is-open');
    document.documentElement.classList.add('sheet-lock');
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ s.classList.add('is-visible'); }); });
    setTimeout(function(){
      var target = s.querySelector('[data-sheet-autofocus]');
      if(!target){ var b = s.querySelector('[data-sheet-body]'); target = b && Array.prototype.find.call(b.querySelectorAll(FOCUSABLE), visible); }
      target = target || s.querySelector('[data-sheet-panel]');
      target && target.focus({preventScroll:true});
    }, 60);
    fire(s, 'sheet:open');
    return s;
  }

  function close(s, opts){
    if(typeof s === 'string') s = byName(s);
    s = s || stack[stack.length-1];
    if(!s || !s.classList.contains('is-open')) return;
    opts = opts || {};
    s.classList.remove('is-visible');
    var i = stack.indexOf(s); if(i > -1) stack.splice(i,1);
    if(!stack.length) document.documentElement.classList.remove('sheet-lock');
    var done = function(){ s.classList.remove('is-open'); };
    if(opts.instant) done(); else s.__sheetTimer = setTimeout(done, ANIM);
    var r = s.__sheetReturn;
    if(!opts.noFocus && r && r.focus && document.contains(r)) r.focus({preventScroll:true});
    fire(s, 'sheet:close');
  }

  document.addEventListener('click', function(e){
    if(!e.target.closest) return;
    var t = e.target.closest('[data-sheet-open]');
    if(t){ e.preventDefault(); open(t.getAttribute('data-sheet-open'), {returnFocus:t}); return; }
    var c = e.target.closest('[data-sheet-close]');
    if(c){ var s = c.closest('[data-sheet]'); if(s && s.classList.contains('is-open')){ e.preventDefault(); close(s); } }
  });

  document.addEventListener('keydown', function(e){
    var s = stack[stack.length-1];
    if(!s) return;
    if(e.key === 'Escape'){ close(s); return; }
    if(e.key === 'Tab'){
      var f = Array.prototype.filter.call(s.querySelectorAll(FOCUSABLE), visible);
      if(!f.length){ e.preventDefault(); return; }
      var a = f[0], z = f[f.length-1];
      if(e.shiftKey && (document.activeElement === a || !s.contains(document.activeElement))){ e.preventDefault(); z.focus(); }
      else if(!e.shiftKey && (document.activeElement === z || !s.contains(document.activeElement))){ e.preventDefault(); a.focus(); }
    }
  });

  window.ShopFlowSheet = { open: open, close: close, top: function(){ return stack[stack.length-1] || null; } };
})();

/* ShopFlow – Quick Add v1.1.0 – product size picker built on ShopFlow Sheet (window.ShopFlowSheet).
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
