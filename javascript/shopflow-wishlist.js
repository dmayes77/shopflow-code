/* ShopFlow – Wishlist v1.0.1 – styles + accessibility for Storesynk wishlist hearts ([sf-add-to-wishlist]).
   Storesynk saves/removes the product and toggles .sf-wishlist-active; this file only handles the look and a11y.
   Markup: any element with sf-add-to-wishlist="1" inside a product context, containing an <svg> heart.
   PARKED – not installed on the site (was Page Shell › embed "ShopFlow Wishlist Code"). Kept for when the wishlist comes back. */
(function(){
  if(window.__sfWishlist) return; window.__sfWishlist = true;
  var SEL = '[sf-add-to-wishlist]';
  function sync(el){
    var on = el.classList.contains('sf-active') || el.classList.contains('sf-wishlist-active');
    if(el.getAttribute('aria-pressed') !== String(on)) el.setAttribute('aria-pressed', String(on));
    var label = on ? 'Remove from wishlist' : 'Add to wishlist';
    if(el.getAttribute('aria-label') !== label) el.setAttribute('aria-label', label);
  }
  function prep(el){
    if(el.__sfWl) return; el.__sfWl = true;
    if(el.tagName !== 'BUTTON'){ el.setAttribute('role','button'); if(!el.hasAttribute('tabindex')) el.setAttribute('tabindex','0'); }
    sync(el);
    new MutationObserver(function(){ sync(el); }).observe(el, {attributes:true, attributeFilter:['class']});
  }
  function scan(root){ (root || document).querySelectorAll(SEL).forEach(prep); }
  /* hearts sit on top of card links: keep the click from following the link */
  document.addEventListener('click', function(e){
    var h = e.target.closest && e.target.closest(SEL);
    if(h && h.closest('a')) e.preventDefault();
  });
  document.addEventListener('keydown', function(e){
    if((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches(SEL) && e.target.tagName !== 'BUTTON'){ e.preventDefault(); e.target.click(); }
  });
  function boot(){
    scan();
    new MutationObserver(function(ms){ ms.forEach(function(m){ m.addedNodes.forEach(function(n){ if(n.nodeType === 1){ if(n.matches(SEL)) prep(n); scan(n); } }); }); })
      .observe(document.body, {childList:true, subtree:true});
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
