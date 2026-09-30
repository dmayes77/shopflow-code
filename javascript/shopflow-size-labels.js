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
