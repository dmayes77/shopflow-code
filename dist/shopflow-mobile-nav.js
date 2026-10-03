/* ShopFlow – Mobile Nav v1.1.0 – wires the Shop tab and navbar hamburger to the
   [data-sheet="mobile-nav"] content, shown as a bottom sheet by the shared Sheet engine. */
(function(){
  if(window.__sfMobileNav) return; window.__sfMobileNav = true;
  var TRIGGER = '.navbar-compact_mobile-trigger';
  function sheet(){ return document.querySelector('[data-sheet="mobile-nav"]'); }

  /* Hamburger: open the drawer instead of the Webflow dropdown (capture phase, before Webflow sees it). */
  function openFrom(e){
    var t = e.target.closest && e.target.closest(TRIGGER);
    if(!t || !window.ShopFlowSheet || !sheet()) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if(e.type === 'click' || e.key === 'Enter' || e.key === ' '){ ShopFlowSheet.open('mobile-nav', {returnFocus:t}); }
  }
  document.addEventListener('click', openFrom, true);
  document.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' ') openFrom(e); }, true);
  ['mousedown','touchstart','mouseup','touchend','tap'].forEach(function(t){ document.addEventListener(t, function(e){ if(e.target.closest && e.target.closest(TRIGGER)) e.stopImmediatePropagation(); }, true); });

  document.addEventListener('click', function(e){
    var s = e.target.closest && e.target.closest('[data-mobile-nav]');
    if(!s) return;
    /* Accordion groups */
    var tog = e.target.closest('[data-mnav-toggle]');
    if(tog){
      e.preventDefault();
      var g = tog.closest('[data-mnav-group]'), on = !g.classList.contains('is-expanded');
      g.classList.toggle('is-expanded', on); tog.setAttribute('aria-expanded', on ? 'true' : 'false');
      return;
    }
    /* Search: close the drawer, then fire the navbar search opener */
    if(e.target.closest('[data-mnav-search]')){
      e.preventDefault();
      ShopFlowSheet.close(s, {instant:true, noFocus:true});
      var o = document.querySelector('.search-popup-opener');
      if(o) setTimeout(function(){ o.click(); }, 30);
      return;
    }
    /* Any real link: close the drawer so same-page links don't leave it open */
    var a = e.target.closest('a[href]');
    if(a && a.getAttribute('href') !== '#') ShopFlowSheet.close(s, {instant:true, noFocus:true});
  });

  document.addEventListener('keydown', function(e){
    if((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-mnav-toggle]')){ e.preventDefault(); e.target.click(); }
  });

  /* Mark the hamburger for assistive tech */
  function prep(){
    document.querySelectorAll(TRIGGER).forEach(function(t){ t.setAttribute('aria-haspopup','dialog'); t.setAttribute('aria-expanded','false'); });
    var s = sheet(); if(!s) return;
    s.addEventListener('sheet:open', function(){ document.querySelectorAll(TRIGGER).forEach(function(t){ t.setAttribute('aria-expanded','true'); }); });
    s.addEventListener('sheet:close', function(){ document.querySelectorAll(TRIGGER).forEach(function(t){ t.setAttribute('aria-expanded','false'); }); });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prep); else prep();
})();
