/* ShopFlow – Navigation experience v1.0.0
 * ShopFlow-specific mobile navigation on top of Core Bottom Nav:
 *   Home · Shop · New · Cart · More
 *
 * The existing Webflow component stays reusable. This layer remaps Search to a
 * "New" storefront view, remaps Account to the shared More sheet, and adds the
 * store's CMS-managed contact, directions and hours above its privacy settings.
 * On touch breakpoints the brand bar exposes the existing Shopify account control.
 *
 * Page Shell CMS contract (the singleton Store Settings item, rendered once on every page):
 *   [data-store-settings]
 *     data-store-business-name
 *     data-store-email / data-store-customer-email
 *     data-store-phone / data-store-customer-phone
 *     data-store-street / data-store-address-2 / data-store-city / data-store-state / data-store-zip / data-store-country
 *     data-store-directions-url
 *     [data-store-hours] (child bound to the Rich Text field)
 */
(function(){
  if(window.__shopflowNavExperience) return;
  window.__shopflowNavExperience = true;

  var TAB = '[data-bottom-nav-tab]';
  var LINK = '[data-bottom-nav-link]';
  var NEW_URL = '/shop-all?view=new';

  var newIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 1.35 4.15L17.5 8.5l-4.15 1.35L12 14l-1.35-4.15L6.5 8.5l4.15-1.35L12 3Z"></path><path d="m18.5 14 .75 2.25L21.5 17l-2.25.75L18.5 20l-.75-2.25L15.5 17l2.25-.75L18.5 14Z"></path><path d="m5 13 .55 1.45L7 15l-1.45.55L5 17l-.55-1.45L3 15l1.45-.55L5 13Z"></path></svg>';
  var moreIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6"></circle><circle cx="12" cy="12" r="1.6"></circle><circle cx="19" cy="12" r="1.6"></circle></svg>';

  function tabByLabel(label){
    return Array.prototype.find.call(document.querySelectorAll(TAB), function(tab){
      var link = tab.querySelector(LINK);
      var text = tab.querySelector('.bottom-nav_label');
      return (link && (link.getAttribute('data-label') || link.getAttribute('aria-label')) === label) ||
        (text && text.textContent.trim() === label);
    }) || null;
  }

  function setTab(tab, options){
    if(!tab) return;
    var link = tab.querySelector(LINK);
    var label = tab.querySelector('.bottom-nav_label');
    var icon = tab.querySelector('.bottom-nav_icon-slot');
    tab.setAttribute('data-tab-action', options.action || '');
    tab.setAttribute('data-nav-role', options.role);
    if(label) label.textContent = options.label;
    if(icon) icon.innerHTML = options.icon;
    if(link){
      link.setAttribute('href', options.href);
      link.setAttribute('aria-label', options.ariaLabel || options.label);
      link.setAttribute('data-label', options.ariaLabel || options.label);
      if(options.action && options.action.indexOf('sheet:') === 0) link.setAttribute('aria-haspopup', 'dialog');
      else link.removeAttribute('aria-haspopup');
      link.removeAttribute('aria-current');
    }
  }

  function businessInfo(){
    var source = document.querySelector('[data-store-settings]');
    if(!source) return null;
    var value = function(name){
      var attributeValue = (source.getAttribute(name) || '').trim();
      if(attributeValue) return attributeValue;
      var child = source.querySelector('[' + name + ']');
      return child ? child.textContent.replace(/\s+/g, ' ').trim() : '';
    };
    var cityLine = [value('data-store-city'), value('data-store-state'), value('data-store-zip')].filter(Boolean).join(' ');
    var address = [value('data-store-street'), value('data-store-address-2'), cityLine, value('data-store-country')].filter(Boolean).join(', ');
    var hours = source.querySelector('[data-store-hours]');
    return {
      name: value('data-store-business-name'),
      email: value('data-store-customer-email') || value('data-store-email'),
      phone: value('data-store-customer-phone') || value('data-store-phone'),
      address: address,
      directions: value('data-store-directions-url'),
      hours: hours ? hours.textContent.replace(/\s+/g, ' ').trim() : ''
    };
  }

  function phoneHref(phone){
    var digits = (phone || '').replace(/\D/g, '');
    if(digits.length === 10) digits = '1' + digits;
    return digits ? 'tel:+' + digits : '';
  }

  function addInfoRow(parent, title, detail, href, external){
    if(!detail) return;
    var row = document.createElement(href ? 'a' : 'div');
    row.setAttribute(href ? 'data-more-link' : 'data-more-hours', '');
    if(href){
      row.href = href;
      if(external){ row.target = '_blank'; row.rel = 'noopener'; }
    }
    var copy = document.createElement('span');
    copy.setAttribute('data-more-link-copy', '');
    var strong = document.createElement('strong');
    strong.textContent = title;
    var small = document.createElement('small');
    small.textContent = detail;
    copy.append(strong, small);
    row.appendChild(copy);
    if(href){
      var arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';
      row.appendChild(arrow);
    }
    parent.appendChild(row);
  }

  function addMoreContent(){
    var sheet = document.querySelector('[data-sheet="site-settings"]');
    if(!sheet || sheet.querySelector('[data-more-section]')) return;
    sheet.setAttribute('data-sheet-title', 'More');
    sheet.setAttribute('data-sheet-height', 'tall');
    var body = sheet.querySelector('[data-sheet-body]');
    if(!body) return;

    var info = businessInfo();
    if(!info || ![info.name, info.email, info.phone, info.address, info.directions, info.hours].some(Boolean)) return;

    var section = document.createElement('section');
    section.setAttribute('data-more-section', '');
    section.setAttribute('aria-labelledby', 'shopflow-more-store');
    var heading = document.createElement('h2');
    heading.id = 'shopflow-more-store';
    heading.className = 'heading-h4';
    heading.textContent = info.name ? 'Visit ' + info.name : 'Visit or get in touch';
    var links = document.createElement('div');
    links.setAttribute('data-more-links', '');
    addInfoRow(links, 'Contact us', info.email, info.email ? 'mailto:' + info.email : '', false);
    addInfoRow(links, 'Call the store', info.phone, phoneHref(info.phone), false);
    addInfoRow(links, 'Directions', info.address, info.directions, true);
    addInfoRow(links, 'Store hours', info.hours, '', false);
    section.append(heading, links);
    body.insertBefore(section, body.firstChild);
  }

  function activateNewView(newTab, shopTab){
    var isNew = location.pathname.replace(/\/+$/, '') === '/shop-all' && new URLSearchParams(location.search).get('view') === 'new';
    if(newTab) newTab.classList.toggle('is-active', isNew);
    if(shopTab && isNew) shopTab.classList.remove('is-active');
    var newLink = newTab && newTab.querySelector(LINK);
    var shopLink = shopTab && shopTab.querySelector(LINK);
    if(newLink){ if(isNew) newLink.setAttribute('aria-current', 'page'); else newLink.removeAttribute('aria-current'); }
    if(shopLink && isNew) shopLink.removeAttribute('aria-current');
    if(!isNew) return;

    var heading = document.querySelector('main h1, h1');
    if(heading && heading.textContent.trim() === 'Shop All') heading.textContent = 'New Arrivals';
    var store = businessInfo();
    document.title = 'New Arrivals | ' + ((store && store.name) || 'ShopFlow');

    var sortNewest = function(){
      document.querySelectorAll('.product-list[sf-list]').forEach(function(list){
        var items = Array.prototype.slice.call(list.children);
        var sorted = items.slice().sort(function(a, b){
          var aProduct = a.querySelector('[sf-product]');
          var bProduct = b.querySelector('[sf-product]');
          var av = Number(aProduct && aProduct.getAttribute('sf-product')) || 0;
          var bv = Number(bProduct && bProduct.getAttribute('sf-product')) || 0;
          return bv - av;
        });
        if(!sorted.every(function(item, i){ return item === items[i]; })) sorted.forEach(function(item){ list.appendChild(item); });
      });
    };
    sortNewest();
    window.setTimeout(sortNewest, 350);
  }

  function init(){
    var searchTab = tabByLabel('Search');
    var accountTab = tabByLabel('Account');
    var shopTab = tabByLabel('Shop');
    setTab(searchTab, {label:'New', ariaLabel:'New arrivals', href:NEW_URL, action:'', role:'new', icon:newIcon});
    setTab(accountTab, {label:'More', ariaLabel:'More', href:'#more', action:'sheet:site-settings', role:'more', icon:moreIcon});
    var hydrate = function(){
      addMoreContent();
      activateNewView(searchTab, shopTab);
    };
    hydrate();
    window.setTimeout(hydrate, 250);
    window.setTimeout(hydrate, 1000);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
