/* ShopFlow – Navigation experience v1.2.0 (native Webflow tab configuration)
 * ShopFlow-specific behavior on top of the native Core Bottom Nav configuration:
 *   Home · Shop · New · Cart · More
 *
 * Webflow owns each tab's label, link, action and icon. This layer activates the
 * "New" storefront view and adds the store's CMS-managed contact, directions
 * and hours above the shared More/privacy settings.
 * On touch breakpoints the brand bar exposes the existing Shopify account control.
 *
 * Page Shell CMS contract (the singleton Store Settings item, rendered once on every page):
 *   [data-store-settings]
 *     data-store-business-name
 *     data-store-email / data-store-customer-email
 *     data-store-phone / data-store-customer-phone
 *     data-store-street / data-store-address-2 / data-store-city / data-store-state / data-store-zip / data-store-country
 *     data-store-directions-url
 *
 * The Business Hours Collection List is also rendered once in the Page Shell:
 *   [data-business-hours-entry]
 *     data-business-hours-day
 *     data-business-hours-order
 *     data-business-hours-open
 *     data-business-hours-close
 *     data-business-hours-closed  (text "true", conditional visibility: Closed is set)
 */
(function(){
  if(window.__shopflowNavExperience) return;
  window.__shopflowNavExperience = true;

  var TAB = '[data-bottom-nav-tab]';
  var LINK = '[data-bottom-nav-link]';

  function tabByLabel(label){
    return Array.prototype.find.call(document.querySelectorAll(TAB), function(tab){
      var link = tab.querySelector(LINK);
      var text = tab.querySelector('.bottom-nav_label');
      return (link && (link.getAttribute('data-label') || link.getAttribute('aria-label')) === label) ||
        (text && text.textContent.trim() === label);
    }) || null;
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
    return {
      name: value('data-store-business-name'),
      email: value('data-store-customer-email') || value('data-store-email'),
      phone: value('data-store-customer-phone') || value('data-store-phone'),
      address: address,
      directions: value('data-store-directions-url'),
      hours: businessHours()
    };
  }

  function businessHours(){
    var dayRank = {monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6,sunday:7};
    var entries = Array.prototype.map.call(document.querySelectorAll('[data-business-hours-entry]'), function(node){
      var read = function(name){
        var attributeValue = (node.getAttribute(name) || '').trim();
        if(attributeValue) return attributeValue;
        // Webflow keeps conditionally hidden elements in the page (.w-condition-invisible): ignore them,
        // so the Closed marker (shown only when the Closed switch is on) reads correctly.
        var child = node.querySelector('[' + name + ']:not(.w-condition-invisible)');
        return child ? child.textContent.replace(/\s+/g, ' ').trim() : '';
      };
      var day = read('data-business-hours-day');
      var closedValue = read('data-business-hours-closed').toLowerCase();
      return {
        day: day,
        order: Number(read('data-business-hours-order')) || dayRank[day.toLowerCase()] || 99,
        open: read('data-business-hours-open'),
        close: read('data-business-hours-close'),
        closed: /^(true|1|yes|on)$/.test(closedValue)
      };
    }).filter(function(entry){ return entry.day; });
    return entries.sort(function(a, b){ return a.order - b.order; });
  }

  function groupedHours(hours){
    return (hours || []).reduce(function(groups, entry){
      var schedule = entry.closed ? 'Closed' : [entry.open, entry.close].filter(Boolean).join('–');
      if(!schedule) return groups;
      var previous = groups[groups.length - 1];
      if(previous && previous.schedule === schedule){
        previous.end = entry.day;
      } else {
        groups.push({start:entry.day, end:entry.day, schedule:schedule});
      }
      return groups;
    }, []);
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

  function addHoursRow(parent, hours){
    var groups = groupedHours(hours);
    if(!groups.length) return;
    var row = document.createElement('div');
    row.setAttribute('data-more-hours', '');
    var copy = document.createElement('span');
    copy.setAttribute('data-more-link-copy', '');
    var strong = document.createElement('strong');
    strong.textContent = 'Store hours';
    var list = document.createElement('span');
    list.setAttribute('data-more-hours-list', '');
    groups.forEach(function(group){
      var line = document.createElement('span');
      line.setAttribute('data-more-hours-line', '');
      var days = document.createElement('span');
      days.textContent = group.start === group.end ? group.start : group.start + '–' + group.end;
      var schedule = document.createElement('span');
      schedule.textContent = group.schedule;
      line.append(days, schedule);
      list.appendChild(line);
    });
    copy.append(strong, list);
    row.appendChild(copy);
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
    if(!info || ![info.name, info.email, info.phone, info.address, info.directions, info.hours.length].some(Boolean)) return;

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
    addHoursRow(links, info.hours);
    section.append(heading, links);
    body.insertBefore(section, body.firstChild);
  }

  function activateNewView(newTab, shopTab){
    var isNew = location.pathname.replace(/\/+$/, '') === '/shop-all' && new URLSearchParams(location.search).get('view') === 'new';
    document.documentElement.classList.toggle('is-new-view', isNew);
    if(newTab) newTab.classList.toggle('is-active', isNew);
    if(shopTab && isNew) shopTab.classList.remove('is-active');
    var newLink = newTab && newTab.querySelector(LINK);
    var shopLink = shopTab && shopTab.querySelector(LINK);
    if(newLink){ if(isNew) newLink.setAttribute('aria-current', 'page'); else newLink.removeAttribute('aria-current'); }
    if(shopLink && isNew) shopLink.removeAttribute('aria-current');
    var hero = document.querySelector('.shop-all-hero');
    if(hero){
      if(isNew) hero.setAttribute('aria-hidden', 'true');
      else hero.removeAttribute('aria-hidden');
    }
    var catalog = document.querySelector('.shop-all-catalog');
    if(catalog && !catalog.id) catalog.id = 'new-arrivals';
    if(!isNew) return;

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
    var newTab = tabByLabel('New');
    var shopTab = tabByLabel('Shop');
    var hydrate = function(){
      addMoreContent();
      activateNewView(newTab, shopTab);
    };
    hydrate();
    window.setTimeout(hydrate, 250);
    window.setTimeout(hydrate, 1000);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
