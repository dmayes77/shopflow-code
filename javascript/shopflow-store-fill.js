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
