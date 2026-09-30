/* ShopFlow – Cart Drawer behavior v1.0.3
 * Works on top of Storesynk's cart ([sf-cart]). Storesynk does all cart logic.
 *  - quantity never goes below 1: minus disabled at 1 (.is-qty-one, aria-disabled), typed values < 1 reset to 1;
 *    the red trash button removes the item
 *  - "Subtotal (N items)" label from [sf-cart-count]
 *  - .is-empty on [sf-cart] when the count is 0 (hides summary/checkout + extras)
 *  - keyboard access for the div-based cart controls
 * Change-guarded writes + paused observer (no render loops).
 */
(() => {
  const cart = document.querySelector('[sf-cart]');
  if (!cart) return;
  const setClass = (el, c, on) => { if (el.classList.contains(c) !== on) el.classList.toggle(c, on); };
  const setText = (el, v) => { if (el && el.textContent !== v) el.textContent = v; };
  const KEYS = '[sf-change-quantity-dec],[sf-change-quantity-inc],[sf-cart-item-remove],[sf-cart-close]';
  const label = cart.querySelector('.cart_subtotal-row > :first-child');

  // minus at qty 1 does nothing (capture phase, before Storesynk's handler); Delete removes
  cart.addEventListener('click', e => {
    const dec = e.target.closest('[sf-change-quantity-dec]');
    const item = dec && dec.closest('[sf-cart-item]');
    if (!item || !item.classList.contains('is-qty-one')) return;
    e.preventDefault(); e.stopImmediatePropagation();
  }, true);
  // typed quantity below 1 (or empty) snaps back to 1 before Storesynk sees the change
  cart.addEventListener('change', e => {
    const q = e.target.closest && e.target.closest('[sf-change-quantity]');
    if (q && !(parseInt(q.value, 10) >= 1)) q.value = '1';
  }, true);
  cart.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches(KEYS)) { e.preventDefault(); e.target.click(); }
  });

  function run() {
    mo.disconnect();
    try {
      cart.querySelectorAll('[sf-cart-item]').forEach(item => {
        const q = item.querySelector('[sf-change-quantity]');
        const one = !!q && Number(q.value || q.getAttribute('value') || 1) <= 1;
        setClass(item, 'is-qty-one', one);
        if (q && q.getAttribute('min') !== '1') q.setAttribute('min', '1');
        const dec = item.querySelector('[sf-change-quantity-dec]');
        if (dec && dec.getAttribute('aria-disabled') !== String(one)) dec.setAttribute('aria-disabled', String(one));
      });
      cart.querySelectorAll(KEYS).forEach(el => {
        if (el.dataset.sfKb) return;
        el.dataset.sfKb = '1'; el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0');
        if (el.matches('[sf-change-quantity-dec]')) el.setAttribute('aria-label', 'Decrease quantity');
        if (el.matches('[sf-change-quantity-inc]')) el.setAttribute('aria-label', 'Increase quantity');
        if (el.matches('[sf-cart-close]')) el.setAttribute('aria-label', 'Close cart');
        if (el.matches('[sf-cart-item-remove]')) el.setAttribute('aria-label', 'Delete item');
      });
      const n = parseInt(document.querySelector('[sf-cart-count]')?.textContent, 10) || 0;
      setText(label, n ? `Subtotal (${n} item${n === 1 ? '' : 's'}):` : 'Subtotal:');
      setClass(cart, 'is-empty', n === 0);
    } finally { mo.takeRecords(); watch(); }
  }
  let t = 0;
  const mo = new MutationObserver(() => { clearTimeout(t); t = setTimeout(run, 30); });
  const watch = () => {
    mo.observe(cart, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['value', 'style'] });
    const c = document.querySelector('[sf-cart-count]'); if (c) mo.observe(c, { subtree: true, childList: true, characterData: true });
  };
  cart.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 30); });
  cart.addEventListener('change', () => { clearTimeout(t); t = setTimeout(run, 30); });
  run();
})();
