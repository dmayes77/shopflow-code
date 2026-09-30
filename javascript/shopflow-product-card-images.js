/* ShopFlow – Responsive Shopify images v1.1.0
 * Source of truth for the script registered in Webflow as "shopflowresponsiveimages"
 * (v1.0.0 was card-only, registered as "shopflowcardimages"). Loaded from the site
 * footer custom code. Webflow's copy is a terser-minified build of this file.
 *
 * Why: Webflow creates responsive sizes for images uploaded in Webflow, but NOT for
 * images that arrive from Shopify (Storesynk sets Shopify CDN URLs at runtime, and
 * API-synced CMS images get no -p-500 variants). Shopify's CDN resizes on the fly
 * with ?width=, so this script gives every Shopify image on the site a proper
 * srcset/sizes (or a right-sized background URL). Webflow-uploaded images are left
 * alone because Webflow already handles them.
 *
 * Covers automatically, site-wide:
 *  - Product Card images (.product-card) – uses Storesynk's sf-current-image
 *  - Any <img> whose src is cdn.shopify.com (PDP gallery sf-show-image, future sections)
 *  - Any element with an inline Shopify background-image (cart items, search results)
 * Re-runs when Storesynk swaps an image (variant change) or adds items (cart).
 * Images that already finished downloading on first sight are left alone.
 */
(() => {
  const CDN = 'cdn.shopify.com';
  const W = [180, 360, 540, 720, 960, 1200, 1600, 2048];
  const url = (s, w) => { const x = new URL(s, location.href); x.searchParams.set('width', w); return x.href; };

  // Layout hints per context ("auto" = real rendered width for lazy images;
  // otherwise the current rendered width, falling back to full viewport width)
  const sizesFor = i =>
    i.closest('.product-card') ? 'auto, (min-width: 992px) 25vw, 50vw' :
    i.hasAttribute('sf-show-image') ? 'auto, (min-width: 992px) 50vw, 100vw' :
    'auto, ' + (i.offsetWidth > 1 ? i.offsetWidth + 'px' : '100vw');

  const img = i => {
    let s = i.getAttribute('src') || '';
    const card = i.matches('.product-card-image') && i.closest('.product-card[sf-product]');
    if (card) { const a = card.querySelector('[sf-current-image]')?.getAttribute('sf-current-image'); if (a) s = a; }
    if (i.dataset.sfResp === s) return;
    if (!s.includes(CDN)) {                       // no longer a Shopify image: undo ours
      if (i.dataset.sfResp) { i.removeAttribute('srcset'); delete i.dataset.sfResp; }
      return;
    }
    const first = !('sfResp' in i.dataset);
    if (first && !card && i.getAttribute('srcset')) return;   // someone else's srcset: respect it
    i.dataset.sfResp = s;
    if (first && i.complete && i.naturalWidth) return;          // already downloaded: no 2nd request
    i.sizes = sizesFor(i);
    i.srcset = W.map(w => url(s, w) + ' ' + w + 'w').join(', ');
  };

  const bg = e => {
    const b = e.style.backgroundImage;
    if (!b || !b.includes(CDN) || /[?&]width=/.test(b)) return;
    const m = b.match(/url\(["']?(.*?)["']?\)/); if (!m) return;
    const need = (e.offsetWidth || 120) * devicePixelRatio;  // hidden (e.g. closed cart) → small thumb
    e.style.backgroundImage = `url("${url(m[1], W.find(w => w >= need) || 2048)}")`;
  };

  const handle = e => {
    if (e.nodeType !== 1) return;
    if (e.tagName === 'IMG') img(e);
    else if (e.hasAttribute('style')) bg(e);
    if (e.hasAttribute('sf-current-image')) {
      const i = e.closest('.product-card[sf-product]')?.querySelector('img.product-card-image');
      if (i) img(i);
    }
  };
  const scan = r => { handle(r); r.querySelectorAll(`img,[style*="${CDN}"],[sf-current-image]`).forEach(handle); };

  new MutationObserver(rs => rs.forEach(r =>
    r.type === 'attributes' ? handle(r.target) : r.addedNodes.forEach(n => n.nodeType === 1 && scan(n))
  )).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'style', 'sf-current-image'] });
  scan(document.documentElement);
})();
