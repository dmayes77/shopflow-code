/* ShopFlow – shopflow-core.js – built from: shopflow-announcement.js core-bottom-nav.js core-consent.js shopflow-nav-experience.js shopflow-store-fill.js shopflow-quick-add.js shopflow-size-labels.js */

/* ShopFlow – Announcement bar + navbar stacking v1.0.0. Core 2.0 upstream candidate.
 * Installed in Page Shell › ShopFlow Core (dist/shopflow-core.js); styles in shopflow-announcement.css.
 * Sets --sf-announcement-offset on <html> = how much of the announcement bar is still on screen
 * (bar height − scroll, never below 0). The fixed navbar uses it as its `top`, so it stacks under the bar,
 * scrolls up with it, then sticks at the top. Works at every width (desktop navbar and mobile brand bar).
 */
(function(){
  if(window.ShopFlowAnnouncement) return;
  var root = document.documentElement, bar = null, height = 0, last = -1, ticking = false;

  function find(){
    var el = document.querySelector('[data-announcement]');
    if(!el) return null;
    // measure the whole CMS list wrapper the bar lives in (it is what takes up space in the flow)
    return el.closest('.w-dyn-list') || el;
  }
  function measure(){
    if(!bar || !bar.isConnected) bar = find();
    height = bar ? Math.max(0, bar.getBoundingClientRect().height) : 0;
    apply();
  }
  function apply(){
    ticking = false;
    var off = Math.max(0, Math.round(height - Math.max(0, window.scrollY || 0)));
    if(off === last) return;
    last = off;
    root.style.setProperty('--sf-announcement-offset', off + 'px');
  }
  function onScroll(){ if(!ticking){ ticking = true; requestAnimationFrame(apply); } }

  function init(){
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    window.addEventListener('load', measure);
    if(bar && window.ResizeObserver) new ResizeObserver(measure).observe(bar);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.ShopFlowAnnouncement = { version: '1.0.0', refresh: measure };
})();


/* Core – Bottom Nav v1.0.0 – behavior for Navigation / Bottom Nav + Navigation / Bottom Nav Tab.
   Core 2.0 (not commerce-specific). Works with the Sheet engine (window.ShopFlowSheet today, window.CoreSheet later).

   Markup contract (built by the Webflow components):
     [data-bottom-nav]                       outer spacer (reserves height so content is never covered)
       nav.bottom-nav_bar
         [data-bottom-nav-tab][data-tab-action="…"]   one per tab (Action prop)
           a[data-bottom-nav-link]                     full-tab hit area (Link prop = no-JS fallback)
           .bottom-nav_badge                           optional, in the Badge slot

   Tab actions (Action prop):
     ""                    normal link (active when the current page matches)
     "sheet:NAME"          opens the sheet [data-sheet="NAME"]
     "click:SELECTOR"      clicks an existing control, e.g. click:[sf-cart-open]
   Badges whose text is empty or 0 get .is-empty (hidden); the tab's accessible name includes the count. */
(function(){
  if(window.__coreBottomNav) return; window.__coreBottomNav = true;
  var TAB = '[data-bottom-nav-tab]', LINK = '[data-bottom-nav-link]';
  function sheetApi(){ return window.CoreSheet || window.ShopFlowSheet || null; }
  function norm(p){ p = (p || '/').replace(/\/+$/, ''); return p || '/'; }

  document.addEventListener('click', function(e){
    var link = e.target.closest && e.target.closest(LINK);
    if(!link) return;
    var tab = link.closest(TAB), action = tab && (tab.getAttribute('data-tab-action') || '').trim();
    if(!action) return;                                   // plain link: let it navigate
    var i = action.indexOf(':'), kind = action.slice(0, i), arg = action.slice(i + 1).trim();
    if(kind === 'sheet' && sheetApi()){
      e.preventDefault(); sheetApi().open(arg, {returnFocus: link});
    } else if(kind === 'click'){
      var target = null; try{ target = document.querySelector(arg); }catch(err){}
      if(target){ e.preventDefault(); target.click(); }     // missing target: fall back to the link
    }
  });

  function markActive(){
    var here = norm(location.pathname);
    document.querySelectorAll(TAB).forEach(function(tab){
      var link = tab.querySelector(LINK), action = (tab.getAttribute('data-tab-action') || '').trim(), on = false;
      if(link && !action){
        var a = document.createElement('a'); a.href = link.getAttribute('href') || '/';
        if(a.origin === location.origin){ var p = norm(a.pathname); on = p === '/' ? here === '/' : (here === p || here.indexOf(p + '/') === 0); }
      }
      tab.classList.toggle('is-active', on);
      if(link){ if(on) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); }
      if(link && action.indexOf('sheet:') === 0) link.setAttribute('aria-haspopup', 'dialog');
    });
  }

  function syncBadges(){
    document.querySelectorAll(TAB).forEach(function(tab){
      var b = tab.querySelector('.bottom-nav_badge'), link = tab.querySelector(LINK);
      if(!b || !link) return;
      var n = (b.textContent || '').trim(), empty = n === '' || n === '0';
      if(b.classList.contains('is-empty') !== empty) b.classList.toggle('is-empty', empty);
      var base = link.getAttribute('data-label') || link.getAttribute('aria-label') || '';
      if(!link.hasAttribute('data-label')) link.setAttribute('data-label', base);
      var name = empty ? base : base + ', ' + n + (n === '1' ? ' item' : ' items');
      if(link.getAttribute('aria-label') !== name) link.setAttribute('aria-label', name);
    });
  }

  function init(){
    markActive(); syncBadges();
    var t = 0, mo = new MutationObserver(function(){ clearTimeout(t); t = setTimeout(syncBadges, 30); });
    document.querySelectorAll('[data-bottom-nav] .bottom-nav_badge').forEach(function(b){
      mo.observe(b, {childList:true, characterData:true, subtree:true});
    });
    document.documentElement.classList.toggle('has-bottom-nav', !!document.querySelector('[data-bottom-nav]'));
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();


/* Core – Consent v1.0.0 – cookie consent + the Site Settings sheet. Core 2.0 (not commerce-specific).
   Uses the Sheet engine (window.CoreSheet / window.ShopFlowSheet). Pairs with the head snippet (Consent Mode v2 defaults),
   which must run BEFORE the Google tag. Categories: essential (always on), analytics, marketing.

   Markup (Webflow component "Core / Site Settings", placed in the Page Shell Overlay slot):
     [data-sheet="site-settings"]  the settings sheet (cog opens it). Sections: [data-settings-section] (privacy now, appearance later)
       [data-consent-switch="analytics|marketing|essential"]   role="switch" buttons
     [data-sheet="cookie-notice"]  first-visit notice
     [data-consent-action="accept-all|necessary|save|customize"]
   Opening: any [data-sheet-open="site-settings"] (the brand-bar cog) or CoreConsent.open().
   Deferred third-party scripts: <script type="text/plain" data-consent="analytics|marketing" src|inline> run once consent is given.
   Events: "core:consent" on document (detail = {analytics, marketing}). */
(function(){
  if(window.CoreConsent) return;
  var KEY = 'core-consent-v1', CATS = ['analytics','marketing'];
  function sheet(){ return window.CoreSheet || window.ShopFlowSheet || null; }
  function read(){ try{ return JSON.parse(localStorage.getItem(KEY)) || null; }catch(e){ return null; } }
  function write(s){ try{ localStorage.setItem(KEY, JSON.stringify(s)); }catch(e){} }
  function g(v){ return v ? 'granted' : 'denied'; }

  function apply(s){
    if(typeof window.gtag === 'function'){
      window.gtag('consent', 'update', { analytics_storage: g(s.analytics), ad_storage: g(s.marketing), ad_user_data: g(s.marketing), ad_personalization: g(s.marketing) });
    }
    document.querySelectorAll('script[type="text/plain"][data-consent]').forEach(function(old){
      if(!s[old.getAttribute('data-consent')] || old.hasAttribute('data-consent-ran')) return;
      old.setAttribute('data-consent-ran', '');
      var n = document.createElement('script');
      Array.prototype.forEach.call(old.attributes, function(a){ if(a.name !== 'type' && a.name.indexOf('data-consent') !== 0) n.setAttribute(a.name, a.value); });
      if(!old.src) n.text = old.text;
      old.parentNode.insertBefore(n, old.nextSibling);
    });
    try{ document.dispatchEvent(new CustomEvent('core:consent', {detail: {analytics: !!s.analytics, marketing: !!s.marketing}})); }catch(e){}
  }

  function sync(s){
    s = s || read() || {};
    document.querySelectorAll('[data-consent-switch]').forEach(function(sw){
      var c = sw.getAttribute('data-consent-switch'), on = c === 'essential' ? true : !!s[c];
      sw.setAttribute('role', 'switch'); if(sw.tagName === 'BUTTON') sw.type = 'button'; else if(!sw.hasAttribute('tabindex')) sw.setAttribute('tabindex', '0');
      sw.setAttribute('aria-checked', on ? 'true' : 'false');
      if(c === 'essential') sw.setAttribute('aria-disabled', 'true');
    });
  }
  function fromSwitches(){
    var s = {};
    CATS.forEach(function(c){ var sw = document.querySelector('[data-consent-switch="' + c + '"]'); s[c] = !!sw && sw.getAttribute('aria-checked') === 'true'; });
    return s;
  }
  function set(s){
    s = { analytics: !!s.analytics, marketing: !!s.marketing, v: 1, ts: new Date().toISOString() };
    write(s); sync(s); apply(s);
    if(sheet()) sheet().close();
    return s;
  }
  function open(){ sync(); if(sheet()) sheet().open('site-settings'); }

  document.addEventListener('click', function(e){
    if(!e.target.closest) return;
    var sw = e.target.closest('[data-consent-switch]');
    if(sw){
      e.preventDefault();
      if(sw.getAttribute('aria-disabled') === 'true') return;
      sw.setAttribute('aria-checked', sw.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
      return;
    }
    var b = e.target.closest('[data-consent-action]');
    if(!b) return;
    e.preventDefault();
    var a = b.getAttribute('data-consent-action');
    if(a === 'accept-all') set({analytics: true, marketing: true});
    else if(a === 'necessary') set({analytics: false, marketing: false});
    else if(a === 'save') set(fromSwitches());
    else if(a === 'customize'){ if(sheet()) sheet().close(null, {instant: true, noFocus: true}); setTimeout(open, 30); }
  });
  document.addEventListener('sheet:open', function(){ sync(); });
  /* Webflow renders these as div/link elements: make them real controls for keyboard and screen readers */
  function prepActions(){
    document.querySelectorAll('[data-consent-action]').forEach(function(b){
      if(b.tagName === 'BUTTON'){ b.type = 'button'; return; }
      b.setAttribute('role', 'button'); if(!b.hasAttribute('tabindex')) b.setAttribute('tabindex', '0'); b.removeAttribute('href');
    });
  }
  document.addEventListener('keydown', function(e){
    if((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-consent-switch]:not(button),[data-consent-action]:not(button)')){ e.preventDefault(); e.target.click(); }
  });

  function init(){
    var s = read();
    prepActions(); sync(s);
    if(s) apply(s);
    else if(document.querySelector('[data-sheet="cookie-notice"]')){
      setTimeout(function(){ if(!read() && sheet() && !sheet().top()) sheet().open('cookie-notice'); }, 1200);
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.CoreConsent = { get: read, set: set, open: open };
})();


/* ShopFlow – Navigation experience v1.3.0 (native Webflow tab configuration)
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


/* ShopFlow – Store fill v1.0.0 – global Store Settings values anywhere on the page. Core 2.0 upstream candidate.
 * Installed in Page Shell › ShopFlow Core (dist/shopflow-core.js).
 *
 * SOURCE – the hidden global CMS layer in the Page Shell (one Store Settings item, rendered on every page):
 *   [data-store-settings] [data-store-business-name] / [data-store-email] / [data-store-phone] / [data-store-street] …
 *       (the existing identity/contact spans; the field name is the attribute minus "data-store-")
 *   [data-store-field="slug"]   any other Store Settings field, as a native Webflow element bound in the Designer:
 *       Image → its src · Link → its href · anything else → its text.  Empty bindings (.w-dyn-bind-empty) count as empty.
 *   Computed: "address" (street, line 2, city state zip, country) and "phone-href" / "email-href".
 *
 * TARGETS – put data-store="field" on any element, in any component:
 *   <img data-store="logo">                 src (+ alt from business-name when the image has none)
 *   <a data-store="facebook-url">           href  (fields ending in -url)
 *   <a data-store="email"> / "phone"        text + mailto: / tel:
 *   <p data-store="returns-summary">        text
 *   data-store-href="field"                 also set an element's href from another field
 *   data-store-empty="hide"                 hide the element when the field is empty (default: keep the static fallback)
 * Filled elements get .is-store-filled. Read values in code with ShopFlowStore.get('field').
 */
(function(){
  if(window.ShopFlowStore) return;
  var cache = null;

  function clean(t){ return (t || '').replace(/\s+/g, ' ').trim(); }
  function isEmptyBind(el){ return el.classList.contains('w-dyn-bind-empty') || el.classList.contains('w-condition-invisible'); }

  function read(){
    var data = {};
    var legacy = document.querySelector('[data-store-settings]');
    if(legacy){
      Array.prototype.forEach.call(legacy.querySelectorAll('*'), function(el){
        Array.prototype.forEach.call(el.attributes, function(a){
          if(a.name.indexOf('data-store-') !== 0 || a.name === 'data-store-hours') return;
          var key = a.name.slice(11), v = clean(a.value) || clean(el.textContent);
          if(v && !data[key]) data[key] = v;
        });
      });
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-store-field]'), function(el){
      var key = el.getAttribute('data-store-field'); if(!key || isEmptyBind(el)) return;
      var v = '';
      if(el.tagName === 'IMG') v = el.getAttribute('src') || '';
      else if(el.tagName === 'A') v = el.getAttribute('href') || '';
      else v = clean(el.textContent);
      if(v === '#' || /placeholder\.(svg|png)/i.test(v)) v = '';
      if(v) data[key] = v;
    });
    var cityLine = [data.city, data.state, data.zip].filter(Boolean).join(' ');
    var address = [data.street, data['address-2'], cityLine, data.country].filter(Boolean).join(', ');
    if(address) data.address = address;
    var phone = data['customer-phone'] || data.phone, email = data['customer-email'] || data.email;
    if(phone){ data['phone-href'] = 'tel:' + phone.replace(/[^\d+]/g, ''); }
    if(email){ data['email-href'] = 'mailto:' + email; }
    return data;
  }

  function get(key){ if(!cache) cache = read(); return cache[key] || ''; }

  function fill(){
    cache = read();
    Array.prototype.forEach.call(document.querySelectorAll('[data-store],[data-store-href]'), function(el){
      if(el.closest('[data-store-settings]') || el.hasAttribute('data-store-field')) return;
      var key = el.getAttribute('data-store'), v = key ? get(key) : '';
      var hrefKey = el.getAttribute('data-store-href'), href = hrefKey ? get(hrefKey) : '';
      if(key){
        if(!v){
          if(el.getAttribute('data-store-empty') === 'hide') el.hidden = true;
        } else if(el.tagName === 'IMG'){
          if(el.getAttribute('src') !== v){ el.removeAttribute('srcset'); el.removeAttribute('sizes'); el.setAttribute('src', v); }
          if(!el.getAttribute('alt') || el.hasAttribute('data-store-alt')) el.setAttribute('alt', get('business-name'));
          el.hidden = false; el.classList.add('is-store-filled');
        } else if(el.tagName === 'A' && /-url$/.test(key)){
          el.setAttribute('href', v); el.hidden = false; el.classList.add('is-store-filled');
        } else {
          if(el.textContent !== v) el.textContent = v;
          if(el.tagName === 'A' && (key === 'email' || key === 'customer-email')) el.setAttribute('href', get('email-href'));
          if(el.tagName === 'A' && (key === 'phone' || key === 'customer-phone')) el.setAttribute('href', get('phone-href'));
          el.hidden = false; el.classList.add('is-store-filled');
        }
      }
      if(href) el.setAttribute('href', href);
    });
    document.documentElement.classList.add('store-filled');
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill); else fill();
  window.addEventListener('load', fill);

  window.ShopFlowStore = { version: '1.0.0', get: get, all: function(){ cache = read(); return Object.assign({}, cache); }, fill: fill };
})();


/* ShopFlow – Quick Add v1.3.2 – product option picker shown in the shared Mayes Core sheet.
   Installed in Page Shell › embed "ShopFlow Core Code" (section 2).
   Card "Add to cart" / "+" on a product with 2+ sizes opens the [data-quick-add] sheet that sits next to the card in the
   same collection item (it carries its own sf-product context). One-size products add straight to cart.
   Storesynk handles variant selection (sf-change-option / sf-option-value) and cart (sf-add-to-cart / sf-buy-now). */
(function(){
  /* A legacy cache-keyed core may run first and set the old boolean guard before
     CoreSheet exists. Keep a versioned guard so the current runtime can recover. */
  if(window.__sfQuickAddVersion === '1.3.2') return;
  window.__sfQuickAdd = true;
  window.__sfQuickAddVersion = '1.3.2';
  var CARD_BTN = '.product-card .product-card-actions .button, .product-card .product-card-actions [sf-add-to-cart]';
  function sheetApi(){ return window.CoreSheet || window.ShopFlowSheet; }

  function sheetFor(btn){
    var item = btn.closest('.w-dyn-item, [role="listitem"]');
    if(!item) return null;
    if(!item.__sfSheet) item.__sfSheet = item.querySelector('[data-quick-add]');
    return item.__sfSheet;
  }
  function options(s){ return s.querySelectorAll('[data-quick-add-sizes] [sf-option-value]'); }
  function selected(s){ return s.querySelector('[data-quick-add-sizes] [sf-option-value].is-selected'); }
  function setLabel(s, txt){ var l = s.querySelector('[data-quick-add-selected]'); if(l) l.textContent = txt; }
  function refresh(s){
    var sel = selected(s);
    s.classList.remove('is-invalid');
    setLabel(s, sel ? (sel.getAttribute('sf-option-value') || sel.textContent.trim()) : 'Select');
    s.querySelectorAll('[data-sheet-footer] .button').forEach(function(b){ b.classList.toggle('is-waiting', !sel); });
  }
  function prep(s){
    if(s.__qaReady) return; s.__qaReady = true;
    /* CoreSheet owns the visible grabber and close control. Hide the legacy
       header embedded in each Quick Add CMS item so it cannot render twice. */
    var legacyHead = s.querySelector('[data-sheet-head="1"]');
    if(legacyHead){ legacyHead.hidden = true; legacyHead.style.display = 'none'; legacyHead.setAttribute('aria-hidden','true'); }
    var list = s.querySelector('[data-quick-add-sizes]');
    if(list) list.setAttribute('role','radiogroup');
    options(s).forEach(function(o){ o.setAttribute('role','radio'); o.setAttribute('tabindex','0'); o.setAttribute('aria-checked','false'); });
  }
  function reset(s){
    options(s).forEach(function(o){ o.classList.remove('is-selected'); o.setAttribute('aria-checked','false'); });
    refresh(s);
  }

  /* 1. Intercept the card button before Storesynk sees it (capture phase). */
  document.addEventListener('click', function(e){
    var btn = e.target.closest && e.target.closest(CARD_BTN);
    var api = sheetApi();
    if(!btn || btn.closest('[data-quick-add]') || !btn.closest('.product-card') || !api) return;
    var s = sheetFor(btn);
    if(!s) return;
    prep(s);
    if(options(s).length < 2) return;            // one size: let Storesynk add it
    e.preventDefault(); e.stopImmediatePropagation();
    reset(s);
    api.open(s, {returnFocus: btn});
  }, true);

  /* 2. Inside the sheet: size pick and the "choose a size first" gate. */
  document.addEventListener('click', function(e){
    var s = e.target.closest && e.target.closest('[data-quick-add]');
    if(!s) return;
    var opt = e.target.closest('[data-quick-add-sizes] [sf-option-value]');
    if(opt){
      options(s).forEach(function(o){ var on = o === opt; o.classList.toggle('is-selected', on); o.setAttribute('aria-checked', on ? 'true' : 'false'); });
      refresh(s); return;                         // Storesynk also receives this click and switches the variant
    }
    var act = e.target.closest('[data-sheet-footer] [sf-add-to-cart], [data-sheet-footer] [sf-buy-now]');
    if(act){
      if(options(s).length > 1 && !selected(s)){
        e.preventDefault(); e.stopImmediatePropagation();
        s.classList.add('is-invalid'); setLabel(s, 'Please select a size');
        var f = options(s)[0]; f && f.focus({preventScroll:true});
        return;
      }
      var api = sheetApi();
      setTimeout(function(){ api && api.close(s, {instant:true, noFocus:true}); }, 150); // Storesynk opens the cart / checkout
    }
  }, true);

  document.addEventListener('keydown', function(e){
    if((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-quick-add-sizes] [sf-option-value]')){ e.preventDefault(); e.target.click(); }
  });
})();


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

