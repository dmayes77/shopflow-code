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
