/* ShopFlow – Cart Drawer behavior v1.4.0
 * Works on top of Storesynk's cart ([sf-cart]); Storesynk remains responsible
 * for product, quantity, price, checkout and persistence.
 *
 * Adds the presentation/accessibility behavior the Webflow cart needs:
 *  - quantity floor of 1 and an explicit remove control
 *  - live "Your Cart (N)" and subtotal labels
 *  - working Clear Cart and Continue Shopping controls
 *  - modal scroll lock + bottom-nav inert state while open
 *  - Escape, focus containment and swipe-down-to-close on phones
 */
(() => {
  if (window.__shopflowCartDrawer) return;
  window.__shopflowCartDrawer = true;

  const cart = document.querySelector('[sf-cart]');
  if (!cart) return;
  const popup = cart.closest('[sf-cart-popup]');
  if (!popup) return;

  const setClass = (el, name, on) => {
    if (el && el.classList.contains(name) !== on) el.classList.toggle(name, on);
  };
  const setText = (el, value) => {
    if (el && el.textContent !== value) el.textContent = value;
  };
  const KEYS = '[sf-change-quantity-dec],[sf-change-quantity-inc],[sf-cart-item-remove],[sf-cart-close],[data-cart-clear],[data-cart-continue]';
  const title = cart.querySelector('.cart_header h3');
  const subtotalLabel = cart.querySelector('.cart_subtotal-row > :first-child');
  const clearControl = cart.querySelector('[data-cart-clear]');
  const note = cart.querySelector('[data-cart-note]');
  const continueControl = cart.querySelector('[data-cart-continue]');
  const bottomNav = document.querySelector('[data-bottom-nav],.bottom-nav_bar');

  setText(clearControl, 'Clear Cart');
  setText(note, 'Shipping and tax calculated at checkout.');
  setText(continueControl, 'Continue Shopping');

  const visibleItems = () => Array.from(cart.querySelectorAll('[sf-cart-item]')).filter(item => {
    if (item.classList.contains('sf-cart-empty')) return false;
    return getComputedStyle(item).display !== 'none';
  });
  const isVisible = element => {
    if (!element) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  };
  const focusableControls = () => Array.from(cart.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex="0"]'))
    .filter(isVisible);
  const cartCount = () => parseInt(document.querySelector('[sf-cart-count]')?.textContent, 10) || 0;
  const isOpen = () => popup.classList.contains('sf-cart-opened');
  const closeControl = () => cart.querySelector('.cart_header [sf-cart-close]') || popup.querySelector('[sf-cart-close]');
  const closeCart = () => closeControl()?.click();

  /* Storesynk owns the close action; Mayes Core owns the close-control presentation. */
  const normalizeClose = () => {
    const close = closeControl();
    if (!close) return;
    close.setAttribute('data-sheet-x', '');
    close.setAttribute('aria-label', 'Close cart');
  };

  /* minus at one does nothing; the X removes the item */
  cart.addEventListener('click', event => {
    const dec = event.target.closest('[sf-change-quantity-dec]');
    const item = dec && dec.closest('[sf-cart-item]');
    if (!item || !item.classList.contains('is-qty-one')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  cart.addEventListener('change', event => {
    const input = event.target.closest && event.target.closest('[sf-change-quantity]');
    if (input && !(parseInt(input.value, 10) >= 1)) input.value = '1';
  }, true);

  cart.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches(KEYS)) {
      event.preventDefault();
      event.target.click();
    }
  });

  let clearing = false;
  let clearAttempts = 0;
  const clearNext = () => {
    if (!clearing) return;
    const remove = visibleItems()[0]?.querySelector('[sf-cart-item-remove]');
    if (!remove || clearAttempts >= 50) {
      clearing = false;
      clearAttempts = 0;
      return;
    }
    clearAttempts += 1;
    remove.click();
    window.setTimeout(clearNext, 180);
  };
  clearControl?.addEventListener('click', event => {
    event.preventDefault();
    if (clearing) return;
    clearing = true;
    clearAttempts = 0;
    clearNext();
  });

  function render() {
    observer.disconnect();
    try {
      normalizeClose();
      visibleItems().forEach(item => {
        const input = item.querySelector('[sf-change-quantity]');
        const one = !!input && Number(input.value || input.getAttribute('value') || 1) <= 1;
        setClass(item, 'is-qty-one', one);
        if (input && input.getAttribute('min') !== '1') input.setAttribute('min', '1');
        const dec = item.querySelector('[sf-change-quantity-dec]');
        if (dec && dec.getAttribute('aria-disabled') !== String(one)) dec.setAttribute('aria-disabled', String(one));
      });

      cart.querySelectorAll(KEYS).forEach(control => {
        if (!control.dataset.sfKb) {
          control.dataset.sfKb = '1';
          control.setAttribute('role', 'button');
          control.setAttribute('tabindex', '0');
        }
        if (control.matches('[sf-change-quantity-dec]')) control.setAttribute('aria-label', 'Decrease quantity');
        if (control.matches('[sf-change-quantity-inc]')) control.setAttribute('aria-label', 'Increase quantity');
        if (control.matches('[sf-cart-close],[data-cart-continue]')) control.setAttribute('aria-label', 'Close cart');
        if (control.matches('[sf-cart-item-remove]')) control.setAttribute('aria-label', 'Remove item');
        if (control.matches('[data-cart-clear]')) control.setAttribute('aria-label', 'Clear cart');
      });

      const count = cartCount();
      setText(title, count ? `Your Cart (${count})` : 'Your Cart');
      setText(subtotalLabel, count ? `Subtotal (${count} item${count === 1 ? '' : 's'})` : 'Subtotal');
      setClass(cart, 'is-empty', count === 0);
    } finally {
      observer.takeRecords();
      watch();
    }
  }

  let renderTimer = 0;
  const observer = new MutationObserver(() => {
    clearTimeout(renderTimer);
    renderTimer = window.setTimeout(render, 30);
  });
  const watch = () => {
    observer.observe(cart, {
      subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ['value', 'style', 'class']
    });
    const badge = document.querySelector('[sf-cart-count]');
    if (badge) observer.observe(badge, {subtree: true, childList: true, characterData: true});
  };
  cart.addEventListener('input', () => {
    clearTimeout(renderTimer);
    renderTimer = window.setTimeout(render, 30);
  });
  cart.addEventListener('change', () => {
    clearTimeout(renderTimer);
    renderTimer = window.setTimeout(render, 30);
  });
  render();

  /* Core Sheet owns the cart presentation; Storesynk continues to own cart state/actions. */
  let bridging = false;
  const sheet = () => window.CoreSheet || null;
  const openInSheet = () => {
    if (bridging || !isOpen() || !sheet()) return;
    const active = sheet().current && sheet().current();
    if (active === cart) return;
    bridging = true;
    sheet().open(cart, {mode:'drawer', title:'Shopping cart'});
    window.setTimeout(() => { bridging = false; }, 0);
  };
  const closeStoreCart = () => {
    if (!isOpen()) return;
    bridging = true;
    closeCart();
    window.setTimeout(() => { bridging = false; }, 0);
  };

  /* Storesynk's popup class is the source of truth for cart open state. */
  const syncOpen = () => {
    if (bridging) return;
    if (isOpen()) openInSheet();
    else if (sheet() && sheet().current && sheet().current() === cart) sheet().close(null, {noFocus:true});
  };
  new MutationObserver(syncOpen).observe(popup, {attributes:true, attributeFilter:['class']});

  cart.addEventListener('sheet:close', () => {
    if (!bridging) closeStoreCart();
  });
  syncOpen();
})();
