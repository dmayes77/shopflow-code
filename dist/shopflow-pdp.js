/* ShopFlow – Product Page v1.2.8 – option labels ("Size: Small"), selection summary, sale badge + "Save $X", share button,
   stock status, size guide link, description preview ("Read more"), Details open on desktop, sticky add-to-cart bar.
   Storesynk owns variants and cart: the selected option has .sf-active; sold-out variants put .sf-out-of-stock on Add to cart. */
(function(){ function init(){
  var root = document.querySelector('[data-pdp]');
  if(!root || root.__sfPdp) return; root.__sfPdp = true;
  var buy = root.querySelector('[data-pdp-buy]');
  var selectedBox = root.querySelector('[data-pdp-selected]');
  var mainAtc = buy && buy.querySelector('[sf-add-to-cart]:not([sf-buy-now])');
  var SHARE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';

  function groups(){ return Array.prototype.slice.call(root.querySelectorAll('.product-container_option-group')).filter(function(g){ return g.querySelector('.w-dyn-item'); }); }
  function num(el){ if(!el) return NaN; var m = (el.textContent || '').replace(/,/g,'').match(/\d+(\.\d+)?/); return m ? parseFloat(m[0]) : NaN; }
  function money(n){ return '$' + (Math.round(n) === n ? n : n.toFixed(2)); }

  /* photo: sale badge + share */
  var slider = root.querySelector('.product-container_image-slider'), badge, toast;
  if(slider){
    badge = document.createElement('div'); badge.setAttribute('data-pdp-badge',''); badge.textContent = 'On sale'; badge.hidden = true; slider.appendChild(badge);
    var share = document.createElement('button'); share.type = 'button'; share.setAttribute('data-pdp-share',''); share.setAttribute('aria-label','Share this product'); share.innerHTML = SHARE_SVG; slider.appendChild(share);
    toast = document.createElement('div'); toast.setAttribute('data-pdp-share-toast',''); toast.setAttribute('role','status'); slider.appendChild(toast);
    share.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      var t = root.querySelector('[sf-show-title]'), title = t ? t.textContent.trim() : document.title, url = location.href.split('?')[0];
      if(navigator.share){ navigator.share({title: title, url: url}).catch(function(){}); }
      else if(navigator.clipboard){ navigator.clipboard.writeText(url).then(function(){ toast.textContent = 'Link copied'; toast.classList.add('is-shown'); setTimeout(function(){ toast.classList.remove('is-shown'); }, 1600); }); }
    });
  }

  /* stock status next to quantity */
  var qtyBlock = buy && buy.querySelector('.product-container_quantity-block'), stock;
  if(qtyBlock && mainAtc){ stock = document.createElement('span'); stock.setAttribute('data-pdp-stock',''); qtyBlock.appendChild(stock); }

  /* size buttons: S / M / L squares come from shopflow-size-labels (ShopFlow Core, every page). */

  function refresh(){
    var parts = [];
    groups().forEach(function(g){
      var label = g.querySelector('.label'); if(!label) return;
      var name = (label.getAttribute('data-name') || label.textContent.replace(/:.*$/, '')).trim();
      label.setAttribute('data-name', name);
      var on = g.querySelector('.w-dyn-item.sf-active');
      var val = on ? (on.getAttribute('sf-option-value') || on.textContent).trim() : '';
      var chip = label.querySelector('[data-pdp-choice]');
      if(!chip){ label.textContent = name + ': '; chip = document.createElement('span'); chip.setAttribute('data-pdp-choice',''); label.appendChild(chip); }
      if(chip.textContent !== (val || 'Select')) chip.textContent = val || 'Select';
      if(val) parts.push(val);
    });
    if(selectedBox){
      var html = parts.length ? 'Selected: <b>' + parts.join(' · ').replace(/</g,'&lt;') + '</b>' : '';
      if(selectedBox.innerHTML !== html) selectedBox.innerHTML = html;
    }
    /* sale: "Save $X" next to each price, badge on the photo */
    var onSale = false;
    root.querySelectorAll('.product-container_prices-row, [data-pdp-buy-price]').forEach(function(row){
      var p = num(row.querySelector('[sf-show-price]')), c = num(row.querySelector('[sf-show-compare-price]'));
      var save = (c > p && p > 0) ? Math.round((c - p) * 100) / 100 : 0, b = row.querySelector('[data-pdp-save]');
      if(save){ onSale = true; if(!b){ b = document.createElement('span'); b.setAttribute('data-pdp-save',''); row.appendChild(b); } var txt = 'Save ' + money(save); if(b.textContent !== txt) b.textContent = txt; }
      else if(b){ b.parentNode.removeChild(b); }
    });
    if(badge && badge.hidden === onSale) badge.hidden = !onSale;
    var soldOut = !!(mainAtc && mainAtc.classList.contains('sf-out-of-stock'));
    if(stock){ var st = soldOut ? 'Sold out' : 'In stock'; if(stock.textContent !== st) stock.textContent = st; stock.classList.toggle('is-out', soldOut); }
    if(bar){
      var pr = buy.querySelector('[sf-show-price]');
      var txt2 = (pr ? pr.textContent.trim() : '');
      var small = parts.join(' · ');
      var html2 = txt2 + (small ? '<small>' + small.replace(/</g,'&lt;') + '</small>' : '');
      if(barPrice.innerHTML !== html2) barPrice.innerHTML = html2;
      barBtn.textContent = soldOut ? 'Sold out' : 'Add to cart';
      barBtn.disabled = soldOut;
    }
    setupClamp();                                    // Storesynk fills the description after load
  }

  /* sticky bar */
  var bar, barPrice, barBtn;
  if(mainAtc){
    bar = document.createElement('div'); bar.setAttribute('data-pdp-bar',''); bar.setAttribute('aria-hidden','true');
    barPrice = document.createElement('div'); barPrice.setAttribute('data-pdp-bar-price','');
    barBtn = document.createElement('button'); barBtn.type = 'button'; barBtn.setAttribute('data-pdp-bar-btn',''); barBtn.textContent = 'Add to cart'; barBtn.tabIndex = -1;
    bar.appendChild(barPrice); bar.appendChild(barBtn); document.body.appendChild(bar);
    barBtn.addEventListener('click', function(){ mainAtc.click(); });
    var actions = buy.querySelector('.product-container_actions') || mainAtc;
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){
        var e = es[0], passed = !e.isIntersecting && e.boundingClientRect.top < 0;
        bar.classList.toggle('is-shown', passed); bar.setAttribute('aria-hidden', passed ? 'false' : 'true'); barBtn.tabIndex = passed ? 0 : -1;
      }).observe(actions);
    }
  }

  refresh();

  /* size guide link: move it next to the Size label */
  var sg = root.querySelector('[data-pdp-size-guide]');
  if(sg){
    var sizeGroup = groups().filter(function(g){ var l = g.querySelector('.label'); return l && /size/i.test(l.getAttribute('data-name') || l.textContent); })[0];
    if(sizeGroup){
      var l = sizeGroup.querySelector('.label'), row = document.createElement('div');
      row.setAttribute('data-pdp-label-row',''); l.parentNode.insertBefore(row, l); row.appendChild(l); row.appendChild(sg);
      sg.classList.add('is-placed'); sg.setAttribute('role','button'); if(!sg.getAttribute('href')) sg.setAttribute('href','#');
    }
  }

  /* Details: open on desktop, collapsed on phones; long descriptions show a preview with "Read more" */
  var det = root.querySelector('[data-pdp-details]');
  if(det && window.matchMedia('(min-width: 992px)').matches) det.open = true;
  var desc = det && det.querySelector('.product-description'), clampDone = false;
  function setupClamp(){
    if(clampDone || !det || !desc || !det.open) return;
    var lh = parseFloat(getComputedStyle(desc).lineHeight) || 24;
    if(desc.scrollHeight <= lh * 7) return;          // short (or not loaded yet): check again on the next refresh
    clampDone = true;
    det.classList.add('is-clamped');
    var more = document.createElement('button'); more.type = 'button'; more.setAttribute('data-pdp-more',''); more.textContent = 'Read more';
    desc.parentNode.insertBefore(more, desc.nextSibling);
    more.addEventListener('click', function(){ var c = det.classList.toggle('is-clamped'); more.textContent = c ? 'Read more' : 'Show less'; });
  }
  if(det){ det.addEventListener('toggle', setupClamp); requestAnimationFrame(setupClamp); }

  var t = 0;
  var mo = new MutationObserver(function(){ clearTimeout(t); t = setTimeout(function(){ mo.disconnect(); try{ refresh(); } finally { watch(); } }, 30); });
  function watch(){ mo.observe(root, {subtree:true, attributes:true, attributeFilter:['class'], childList:true, characterData:true}); }
  watch();
}
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
