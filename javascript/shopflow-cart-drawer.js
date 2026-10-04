/* ShopFlow – Cart adapter v2.0.0
 * Storesynk owns cart state and commerce actions. ShopFlow reads that state,
 * renders an independent Cart view, and proxies actions back to Storesynk.
 * Core Sheet remains the only visible drawer shell.
 */
(() => {
  if (window.__shopflowCartDrawer) return;
  window.__shopflowCartDrawer = true;

  const cart = document.querySelector('[sf-cart]');
  const popup = cart && cart.closest('[sf-cart-popup]');
  if (!cart || !popup) return;

  const sheet = () => window.CoreSheet || window.ShopFlowSheet || null;
  const isOpen = () => popup.classList.contains('sf-cart-opened');
  const sourceClose = () => cart.querySelector('[sf-cart-close]') || popup.querySelector('[sf-cart-close]');
  const sourceCheckout = () => cart.querySelector('button[sf-checkout],[sf-checkout][data-shopflow-action-2],a[sf-checkout],[sf-checkout]');
  const text = (root, selector) => (root.querySelector(selector)?.textContent || '').trim();

  /* Storesynk includes a non-fetched template item in the cart list. Only
     fetched/product-bound rows are cart state. */
  const sourceItems = () => Array.from(cart.querySelectorAll('[sf-cart-item]')).filter(item => {
    if (item.matches('[sf-cart-empty],.sf-cart-empty')) return false;
    return item.hasAttribute('sf-data-product') ||
      item.hasAttribute('sf-data-variant') ||
      !!item.querySelector('[sf-show-title][sf-data-fetched]');
  });

  const quantityOf = item => {
    const input = item.querySelector('[sf-change-quantity]');
    const value = Number(input && (input.value || input.getAttribute('value')));
    return Number.isFinite(value) && value > 0 ? value : 1;
  };
  const cartCount = () => {
    const quantities = sourceItems().reduce((sum, item) => sum + quantityOf(item), 0);
    if (quantities) return quantities;
    const badge = Array.from(document.querySelectorAll('[sf-cart-count]'))
      .map(node => Number.parseInt(node.textContent, 10))
      .find(Number.isFinite);
    return badge || 0;
  };

  const cartSlot = document.createElement('div');
  cartSlot.setAttribute('data-sheet', 'cart');
  cartSlot.setAttribute('data-sheet-mode', 'drawer');
  cartSlot.setAttribute('data-sheet-height', 'tall');
  cartSlot.setAttribute('data-sheet-title', 'Your Cart');
  cartSlot.hidden = true;

  const viewBody = document.createElement('div');
  viewBody.setAttribute('data-sheet-body', '');
  viewBody.className = 'sf-cart-view__body';
  const toolbar = document.createElement('div');
  toolbar.className = 'sf-cart-view__toolbar';
  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'sf-cart-view__clear';
  clearButton.setAttribute('data-cart-action', 'clear');
  clearButton.textContent = 'Clear Cart';
  toolbar.appendChild(clearButton);
  const itemList = document.createElement('div');
  itemList.className = 'sf-cart-view__items';
  itemList.setAttribute('role', 'list');
  const emptyState = document.createElement('div');
  emptyState.className = 'sf-cart-view__empty';
  emptyState.innerHTML = '<h3>Your cart is empty</h3><p>Game day is calling. Find your next favorite look.</p>';
  viewBody.append(toolbar, itemList, emptyState);

  const viewFooter = document.createElement('div');
  viewFooter.setAttribute('data-sheet-footer', '');
  viewFooter.className = 'sf-cart-view__footer';
  const summary = document.createElement('div');
  summary.className = 'sf-cart-view__summary';
  const subtotalLabel = document.createElement('span');
  subtotalLabel.className = 'sf-cart-view__subtotal-label';
  const subtotal = document.createElement('strong');
  subtotal.className = 'sf-cart-view__subtotal';
  const note = document.createElement('p');
  note.className = 'sf-cart-view__note';
  note.textContent = 'Shipping and tax calculated at checkout.';
  summary.append(subtotalLabel, subtotal, note);
  const checkoutButton = document.createElement('button');
  checkoutButton.type = 'button';
  checkoutButton.className = 'sf-cart-view__checkout';
  checkoutButton.setAttribute('data-cart-action', 'checkout');
  checkoutButton.textContent = 'Checkout';
  const continueButton = document.createElement('button');
  continueButton.type = 'button';
  continueButton.className = 'sf-cart-view__continue';
  continueButton.setAttribute('data-cart-action', 'continue');
  continueButton.textContent = 'Continue Shopping';
  viewFooter.append(summary, checkoutButton, continueButton);
  cartSlot.append(viewBody, viewFooter);
  document.body.appendChild(cartSlot);

  const makeButton = (action, label, content, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `sf-cart-view__${action}`;
    button.setAttribute('data-cart-action', action);
    button.setAttribute('data-cart-item-index', String(index));
    button.setAttribute('aria-label', label);
    button.innerHTML = content;
    return button;
  };

  const imageUrl = item => {
    const image = item.querySelector('[sf-show-image]');
    if (!image) return '';
    const background = image.style.backgroundImage || '';
    const match = background.match(/^url\(["']?(.*?)["']?\)$/);
    return match ? match[1] : '';
  };

  const itemView = (item, index) => {
    const title = text(item, '[sf-show-title]') || 'Cart item';
    const quantity = quantityOf(item);
    const row = document.createElement('article');
    row.className = 'sf-cart-view__item';
    row.setAttribute('role', 'listitem');

    const media = document.createElement('div');
    media.className = 'sf-cart-view__media';
    const url = imageUrl(item);
    if (url) {
      const image = document.createElement('img');
      image.src = url;
      image.alt = title;
      image.loading = 'lazy';
      media.appendChild(image);
    }

    const info = document.createElement('div');
    info.className = 'sf-cart-view__info';
    const name = document.createElement('h3');
    name.className = 'sf-cart-view__name';
    name.textContent = title;
    info.appendChild(name);

    const detailSelectors = [
      '[sf-show-options]',
      '[sf-show-product-note]',
      '[sf-show-subscription-title]',
      '[sf-show-product-discount-title]',
      '[sf-show-discount-code]'
    ];
    const details = detailSelectors.map(selector => text(item, selector)).filter(Boolean);
    if (details.length) {
      const meta = document.createElement('p');
      meta.className = 'sf-cart-view__meta';
      meta.textContent = details.join(' · ');
      info.appendChild(meta);
    }

    const prices = document.createElement('div');
    prices.className = 'sf-cart-view__prices';
    const price = document.createElement('span');
    price.className = 'sf-cart-view__price';
    price.textContent = text(item, '[sf-show-price]');
    prices.appendChild(price);
    const was = text(item, '[sf-show-prediscount-price]');
    if (was && was !== price.textContent) {
      const previous = document.createElement('span');
      previous.className = 'sf-cart-view__price-was';
      previous.textContent = was;
      prices.appendChild(previous);
    }
    info.appendChild(prices);

    const controls = document.createElement('div');
    controls.className = 'sf-cart-view__controls';
    const stepper = document.createElement('div');
    stepper.className = 'sf-cart-view__stepper';
    stepper.setAttribute('aria-label', `Quantity for ${title}`);
    const minus = makeButton('decrease', `Decrease quantity for ${title}`, '<span aria-hidden="true">−</span>', index);
    minus.disabled = quantity <= 1;
    const amount = document.createElement('span');
    amount.className = 'sf-cart-view__quantity';
    amount.setAttribute('aria-live', 'polite');
    amount.textContent = String(quantity);
    const plus = makeButton('increase', `Increase quantity for ${title}`, '<span aria-hidden="true">+</span>', index);
    stepper.append(minus, amount, plus);
    controls.appendChild(stepper);

    const remove = makeButton('remove', `Remove ${title} from cart`, '<span aria-hidden="true">×</span>', index);
    row.append(media, info, remove, controls);
    return row;
  };

  let pendingFocus = null;
  const restoreActionFocus = () => {
    if (!pendingFocus || sheet()?.current?.() !== cartSlot) return;
    const {action, index} = pendingFocus;
    pendingFocus = null;
    const selector = index == null
      ? `[data-cart-action="${action}"]`
      : `[data-cart-action="${action}"][data-cart-item-index="${index}"]`;
    const root = sheet()?.host?.() || cartSlot;
    const target = root.querySelector(selector) || (clearButton.hidden ? continueButton : clearButton);
    target?.focus({preventScroll: true});
  };

  const renderView = () => {
    const activeControl = document.activeElement?.closest?.('[data-cart-action]');
    if (!pendingFocus && activeControl && (viewBody.contains(activeControl) || viewFooter.contains(activeControl))) {
      const activeIndex = activeControl.getAttribute('data-cart-item-index');
      pendingFocus = {
        action: activeControl.getAttribute('data-cart-action'),
        index: activeIndex == null ? null : Number(activeIndex)
      };
    }
    const items = sourceItems();
    const count = cartCount();
    const title = count ? `Your Cart (${count})` : 'Your Cart';
    cartSlot.setAttribute('data-sheet-title', title);
    const coreTitle = sheet()?.current?.() === cartSlot
      ? sheet().host()?.querySelector('[data-sheet-head][data-sheet-default] [data-sheet-title]')
      : null;
    if (coreTitle && coreTitle.textContent !== title) coreTitle.textContent = title;

    itemList.replaceChildren(...items.map(itemView));
    toolbar.hidden = items.length === 0;
    itemList.hidden = items.length === 0;
    emptyState.hidden = items.length !== 0;
    summary.hidden = items.length === 0;
    checkoutButton.hidden = items.length === 0;
    subtotalLabel.textContent = count
      ? `Subtotal (${count} item${count === 1 ? '' : 's'})`
      : 'Subtotal';
    subtotal.textContent = text(cart, '[sf-cart-subtotal]') || '$0.00';
    window.requestAnimationFrame(restoreActionFocus);
  };

  const sourceAction = (index, selector) => sourceItems()[index]?.querySelector(selector);
  const scheduleRender = () => {
    window.clearTimeout(scheduleRender.timer);
    scheduleRender.timer = window.setTimeout(renderView, 40);
  };

  let clearing = false;
  let clearingItem = null;
  let clearFallback = 0;
  const finishClearing = () => {
    clearing = false;
    clearingItem = null;
    window.clearTimeout(clearFallback);
  };
  const clearNext = () => {
    if (!clearing) return;
    const items = sourceItems();
    if (!items.length) {
      finishClearing();
      renderView();
      return;
    }
    if (clearingItem && items.includes(clearingItem)) return;
    clearingItem = items[0];
    const remove = clearingItem.querySelector('[sf-cart-item-remove]');
    if (!remove) {
      finishClearing();
      return;
    }
    remove.click();
    window.clearTimeout(clearFallback);
    clearFallback = window.setTimeout(() => {
      clearingItem = null;
      clearNext();
    }, 1500);
  };

  const handleViewClick = event => {
    const control = event.target.closest('[data-cart-action]');
    if (!control) return;
    const action = control.getAttribute('data-cart-action');
    const indexValue = control.getAttribute('data-cart-item-index');
    const index = indexValue == null ? null : Number(indexValue);

    if (action === 'continue') {
      sheet()?.close();
      return;
    }
    if (action === 'checkout') {
      sourceCheckout()?.click();
      return;
    }
    if (action === 'clear') {
      if (!clearing) {
        pendingFocus = {action: 'continue', index: null};
        clearing = true;
        clearingItem = null;
        clearNext();
      }
      return;
    }

    const selectors = {
      decrease: '[sf-change-quantity-dec]',
      increase: '[sf-change-quantity-inc]',
      remove: '[sf-cart-item-remove]'
    };
    const source = selectors[action] && sourceAction(index, selectors[action]);
    if (!source) return;
    pendingFocus = {action, index};
    source.click();
    scheduleRender();
  };
  viewBody.addEventListener('click', handleViewClick);
  viewFooter.addEventListener('click', handleViewClick);

  let sheetClosing = false;
  let openReturnFocus = null;
  const releaseSheetClosing = () => {
    window.setTimeout(() => {
      sheetClosing = false;
      syncOpenState();
    }, 320);
  };
  document.addEventListener('click', event => {
    const opener = event.target.closest('[sf-cart-open]');
    if (opener) openReturnFocus = opener;
  }, true);

  const openInSheet = () => {
    const api = sheet();
    if (!api || !isOpen()) return;
    popup.classList.add('is-core-sheet-mounted');
    renderView();
    if (api.current?.() !== cartSlot) {
      api.open(cartSlot, {
        mode: 'drawer',
        title: cartSlot.getAttribute('data-sheet-title'),
        returnFocus: openReturnFocus || document.activeElement
      });
    }
  };

  const syncOpenState = () => {
    const api = sheet();
    if (isOpen()) {
      if (sheetClosing) return;
      openInSheet();
      return;
    }
    popup.classList.remove('is-core-sheet-mounted');
    if (api?.current?.() === cartSlot && !sheetClosing) {
      sheetClosing = true;
      api.close(null, {noFocus: true});
      releaseSheetClosing();
    }
  };

  const popupObserver = new MutationObserver(syncOpenState);
  popupObserver.observe(popup, {attributes: true, attributeFilter: ['class']});

  const cartObserver = new MutationObserver(() => {
    if (clearing) {
      const items = sourceItems();
      if (!clearingItem || !items.includes(clearingItem)) {
        clearingItem = null;
        window.clearTimeout(clearFallback);
        window.setTimeout(clearNext, 40);
      }
    }
    scheduleRender();
  });
  cartObserver.observe(cart, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['value', 'style', 'class', 'sf-data-fetched']
  });
  document.querySelectorAll('[sf-cart-count]').forEach(badge => {
    cartObserver.observe(badge, {subtree: true, childList: true, characterData: true});
  });
  cart.addEventListener('input', scheduleRender);
  cart.addEventListener('change', scheduleRender);

  cartSlot.addEventListener('sheet:close', () => {
    if (isOpen() && !sheetClosing) {
      sheetClosing = true;
      sourceClose()?.click();
      releaseSheetClosing();
    }
  });

  renderView();
  syncOpenState();
})();
