# ShopFlow code

Source for every piece of custom code on the ShopFlow storefront (OYG Gameday proof of concept, Webflow site
`shopflow-mayesdigital`). These files are the source of truth. The public repo **dmayes77/shopflow-code** is this
folder, published from the private `shopflow` project repo; the storefront loads the files in `dist/` from it through
jsDelivr. Most embeds remain pinned to a version tag. The Shop All collection-filter embed follows the public `main`
branch so filter changes can ship without editing or republishing the Webflow embed.

Shopify stays the commerce engine. Storesynk does the product, variant, cart and filter logic; this code only adds
layout, behavior and accessibility on top of Storesynk's `sf-*` attributes.

## Where each file is used

| File(s) | Version | Installed in Webflow | Layer |
|---|---|---|---|
| `shopflow-page-stability.css` | 1.0.0 | Page Shell › embed **ShopFlow Core Code** (section 0) | Core 2.0 candidate |
| `core-motion.js` | 0.3.0 | Bundled into Page Shell › **ShopFlow Core Code** | Core 2.0 candidate |
| `shopflow-announcement.css` / `.js` | 1.0.0 | Page Shell › **ShopFlow Core Code** – announcement bar stacked above the navbar; both scroll up, then the navbar sticks at the top (`--sf-announcement-offset`) | Core 2.0 candidate |
| `shopflow-sheet.css` / `.js` | 1.3.0 | Page Shell › embed **ShopFlow Core Code** (section 1) – the shared drawer | Core 2.0 candidate |
| `core-bottom-nav.css` / `.js` | 1.0.0 | Page Shell › **ShopFlow Core Code** – behavior for Navigation / Bottom Nav (tab actions, active tab, badges) | Core 2.0 candidate |
| `core-consent.css` / `.js` | 1.0.0 | Page Shell › **ShopFlow Core Code** – cookie consent + Site Settings sheet (Google Consent Mode v2) | Core 2.0 candidate |
| `core-consent-head.html` | 1.0.0 | **Site settings › Custom code › Head**, above the Google tag – Consent Mode defaults | Core 2.0 candidate |
| `shopflow-brand-bar.css` / `shopflow-nav-experience.js` | 1.1.0 / 1.1.2 | Page Shell › **ShopFlow Core Code** – ≤991px the brand bar shows logo + account; bottom nav is Home · Shop · New · Cart · More; More combines CMS-managed store information with privacy settings | ShopFlow |
| `shopflow-store-fill.js` | 1.0.0 | Page Shell › **ShopFlow Core Code** – fills `[data-store="field"]` slots (logos, footer copy, contact, policies) from the global Store Settings layer | Core 2.0 candidate |
| `shopflow-quick-add.css` / `.js` | 1.1.0 / 1.1.1 | Page Shell › embed **ShopFlow Core Code** (section 2) | ShopFlow |
| `shopflow-size-labels.css` / `.js` | 1.0.0 | Page Shell › ShopFlow Core – every size button shows S / M / L in a rounded square | ShopFlow |
| `shopflow-cart-page-bg.css` | 1.0.0 | Page Shell › embed **ShopFlow Core Code** (section 3) | ShopFlow |
| `shopflow-cart-drawer.css` / `.js` | 2.0.3 / 2.0.4 | Page Shell › cart embed **Popup CSS** – adapter from Storesynk cart state/actions to a ShopFlow-owned Cart view inside Core Sheet | ShopFlow |
| `shopflow-mobile-nav.css` / `.js` | 1.1.2 / 1.1.1 | Navigation / OYG › embed **ShopFlow Mobile Nav Code** | ShopFlow |
| `shopflow-pdp.css` / `.js` | 1.2.8 | Products Template › embed **ShopFlow PDP Code** | ShopFlow |
| `shopflow-collection-filters.css` | 1.6.0 | Shop All › filters embed (`<link id="shopflow-collection-filters-css">`) | ShopFlow |
| `shopflow-collection-filters.js` | 1.6.0 | Shop All › filters embed; maps `?view=sale`, `best-sellers`, `new-arrivals`, and `shop-all` to catalog state | ShopFlow |
| `shopflow-product-card-quick-add.css` | 1.1.0 | Product Card component (mobile "+" button) | ShopFlow |
| `shopflow-product-card-images.js` | 1.1.0 | Site footer custom code (registered script `shopflowresponsiveimages`) | ShopFlow |
| `shopflow-wishlist.css` / `.js` | 1.0.1 | **Parked, not installed.** Kept for when the wishlist comes back. | ShopFlow |

**ShopFlow Core Code** is one embed in the Page Shell (loaded on every page). It loads `dist/shopflow-core.css` / `.js`,
which `build.sh` bundles in this order: page stability → Core Motion → announcement → sheet → bottom nav → consent → ShopFlow navigation → brand bar → store fill → quick add → size
labels → cart page background. `core-consent-head.html` is separate: it goes in Site settings › Custom code › Head.

## The shared drawer (Sheet v1.3.0)

Every page has one drawer, built by `shopflow-sheet.js` (no Webflow markup needed). What it shows is a **content
block**: a hidden element anywhere on the page, named with `data-sheet="name"` (or `data-sheet-content="name"`).
Any element with `data-sheet-open="name"` opens it; `ShopFlowSheet.show({title, html, mode})` opens content built in
JavaScript. While open, the block's `[data-sheet-head]`, `[data-sheet-body]` and `[data-sheet-footer]` are moved into
the drawer and moved back on close, so CMS bindings and Storesynk product context go with them.

| Content | Block | Mode | Opened by |
|---|---|---|---|
| Phone menu | Navigation / OYG › `[data-sheet="mobile-nav"]` | left | hamburger |
| Size guide | Products Template › `[data-sheet="size-guide"]` | center | "Size guide" link |
| Quick Add | each product card › `[data-sheet="quick-add"]` (one per product: it carries that product's sizes) | auto | card "+" / Add to cart |
| Cart | JavaScript-owned `[data-sheet="cart"]`; reads/proxies Storesynk `[sf-cart]` | drawer | existing `[sf-cart-open]` control |

Modes: `auto` (bottom sheet ≤991px, centered dialog above), `drawer` (bottom sheet ≤767px, right-side drawer above –
for Cart and Filters), `bottom`, `center`, `left`, `right`. The host carries `data-sheet-as` = the presentation in use.
Heights (bottom sheets, v1.3.0): `data-sheet-height` = `compact` (quick actions) · `medium` (menus, Shop) · `tall`
(Cart, Filters, Search) · `full`; omit to fit the content (up to 88%). Bottom sheets have a drag handle and close with
a swipe down on the handle or head. While open, everything else on the page is `inert`. Also available as
`window.CoreSheet`.
The Cart adapter leaves Storesynk's original popup DOM in place as the commerce engine, but keeps that popup hidden
from adapter initialization onward so the legacy modal cannot flash before Core Sheet opens.
It renders only ShopFlow-owned markup in Core Sheet and proxies quantity, remove, clear and checkout actions back to
Storesynk. No Storesynk presentation classes or cart chrome are copied into the visible sheet.

Not in the shared drawer, on purpose:
- **Collection filters** – must stay inside the Storesynk collection (`[sf-collection]`) to keep filtering; it is
  a sidebar on desktop and a bottom sheet on phones/tablets (swipe down to close; Sort and Category/Size/Style as chips;
  Style splits into sections from Shopify tag prefixes, see `docs/filter-tag-convention.md`).

New drawer content (search, recently viewed, complete the look, store info…) = a new block + a trigger, no new code
for the drawer itself.

## Mobile bottom nav (v1.0.0)

Phones and tablets (≤991px) get an app-style bottom nav; desktop is unchanged.

- Page Shell has two new slots: **Mobile Nav** (holds `ShopFlow / Bottom Nav`) and **Overlay** (hidden sheet content).
- Core components: `Navigation / Bottom Nav` (Tabs slot) and `Navigation / Bottom Nav Tab` (props Label, Link, Action; slots Icon, Badge).
- `ShopFlow / Bottom Nav` is configured natively in Webflow as **Home · Shop · New · Cart · More**. New links to `/shop-all?view=new`; More uses the `sheet:site-settings` action to open the shared store/privacy sheet. `shopflow-nav-experience.js` supplies only the New-view and CMS-backed More-sheet behavior. The Cart badge is `ShopFlow / Cart Count Badge` (`sf-cart-count`).
- Tab **Action**: empty = normal link · `sheet:NAME` opens a sheet · `click:SELECTOR` clicks an existing control. **Link** is the no-JavaScript fallback.
- Sheets cover the bottom nav (sheet z-index 1002, bar 1000).
- The outer `.bottom-nav` reserves the bar's height, so page content is never hidden behind it.

## Store Settings everywhere (store fill v1.0.0)

The Store Settings CMS item is the one place a client edits their name, logos, contact details, announcement and policy copy.
It reaches the page two ways:

- **Native bindings** where Webflow can do it cleanly: the header logo (Navigation / OYG › `CMS / Logo (Store Settings)`,
  Logo + Alt = Business Name, links Home) and the announcement bar (Page Shell › `CMS / Announcement Bar`, hidden when
  Announcement is empty).
- **Store fill** everywhere else. The hidden Page Shell layer (`[data-store-settings]`) renders the item once per page:
  the original `data-store-*` spans (business name, email, phone, address parts, directions, hours) plus native elements
  marked `data-store-field="slug"` (Logo, Footer Copyright, Short Description, Shipping Message, Returns Summary,
  Facebook URL). `shopflow-store-fill.js` reads them and fills any element marked with a slot:

| Attribute | Effect |
|---|---|
| `data-store="logo"` on an Image | src (srcset removed); alt = business name when empty or with `data-store-alt` |
| `data-store="facebook-url"` (any `*-url`) on a Link | href |
| `data-store="email"` / `"phone"` on a Link | text + `mailto:` / `tel:` |
| `data-store="returns-summary"` (any other field) | text |
| `data-store="address"` | computed: street, line 2, city state zip, country |
| `data-store-href="field"` | also sets href from another field |
| `data-store-empty="hide"` | hide when the field is empty (default keeps the static fallback) |

Current slots: footer logo, copyright, Facebook link and contact block (short description, address, phone, email);
phone menu logo and shipping note; PDP shipping and returns lines. Code can read values with `ShopFlowStore.get('field')`.
A new field = add it to Store Settings, bind a `data-store-field` element in the hidden layer, add `data-store` slots.
Shopify-owned data (products, prices, inventory) never goes through Store Settings.

## More sheet & cookie consent

- The singleton Webflow CMS collection **Store Settings** is rendered once in Page Shell as a hidden `[data-store-settings]` element. Hidden child elements bind identity, contact, split address and directions fields, making the record available on every page without hardcoding client data in JavaScript. A Store Hours plain-text binding can be added later without changing the navigation code.
- `Core / Site Settings` (Page Shell › Overlay slot) holds two sheets: **site-settings** (presented as More: CMS-driven Contact, Call, Directions, Hours, plus Privacy & cookies) and **cookie-notice** (first visit: Accept all · Necessary only · Customize).
- The hidden Page Shell CMS layer contains the singleton `Store Settings` item plus a `Business Hours` Collection List. Each hours item exposes `data-business-hours-entry` with `data-business-hours-day`, `data-business-hours-order`, `data-business-hours-open`, `data-business-hours-close`, and `data-business-hours-closed`. Core sorts Monday–Sunday and groups adjacent days with the same schedule for the More sheet.
- The mobile/tablet brand bar exposes the existing Shopify account control. The bottom-nav More tab opens `site-settings`. Desktop privacy entry point remains a footer "Cookie settings" link with `data-sheet-open="site-settings"` (to add).
- The choice is stored in `localStorage` (`core-consent-v1`). `core-consent-head.html` sets Google Consent Mode v2 defaults (denied until accepted) and must sit above the Google tag; `core-consent.js` sends the update. Storesynk's GA4 e-commerce events go through that same tag, so they follow consent.
- Other trackers (Meta, TikTok…): add them as `<script type="text/plain" data-consent="marketing">` and they run only after consent.
- Future settings (e.g. Appearance / dark mode) = another `[data-settings-section]` in the Settings sheet.

## Design decisions reflected in the code

- Shapes: no pill shapes on the storefront. Badges, buttons, size options and quantity boxes use Core 2.0
  `Radius/small` (`--_surface---radius--small`, 8px). Icon-only buttons (close ✕, share, cart count, card "+",
  cart delete) stay circles.
- Size buttons everywhere (product page, Quick Add, anything added later) show S / M / L in a rounded square
  (`shopflow-size-labels`); Shopify keeps the full size names, which stay in the "Size:" label, tooltip and cart.
- Product page policies (shipping, returns, pickup, size chart) are placeholder copy for the proof of concept and
  live as editable text in the Products Template, not in code.

## Folder layout

- `javascript/` – the sources you edit (one feature per file, version in each file header).
- `dist/` – what Webflow loads. Built by `sh build.sh`; never edit by hand.
  - `shopflow-core.css` / `.js` = page stability + sheet + bottom nav + consent + brand bar + quick add + size labels + cart page background (every page).
  - `shopflow-pdp`, `shopflow-cart-drawer`, `shopflow-mobile-nav`, `shopflow-collection-filters` (`.css` / `.js`).
- `build.sh` – rebuilds `dist/`.

## How the storefront loads it

Feature embeds can stay pinned to a release tag (example for the product page):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/dmayes77/shopflow-code@v1.3.0/dist/shopflow-pdp.css">
<script defer src="https://cdn.jsdelivr.net/gh/dmayes77/shopflow-code@v1.3.0/dist/shopflow-pdp.js"></script>
```

| Webflow embed | Loads |
|---|---|
| Page Shell › **ShopFlow Core Code** | `dist/shopflow-core.css`, `dist/shopflow-core.js`; a permanent inline loader requests stable `@main` URLs with a five-minute cache key, so the embed never changes while releases still propagate promptly |
| Page Shell › cart embed **Popup CSS** | `dist/shopflow-cart-drawer.css`, `.js`; loaded from `@main` |
| Navigation / OYG › **ShopFlow Mobile Nav Code** | `dist/shopflow-mobile-nav.css`, `.js`; loaded from `@main` |
| Products Template › **ShopFlow PDP Code** | `dist/shopflow-pdp.css`, `.js`; loaded from `@main` |
| Shop All › filters embed | `dist/shopflow-collection-filters.css` (the `<link>` keeps `id="shopflow-collection-filters-css"`), `.js`; loaded from `@main` |

Not on jsDelivr (yet): the Product Card component embed (`shopflow-product-card-quick-add.css`) and the site footer responsive-image script (`shopflow-product-card-images.js`), which is registered in Webflow. Navbar scroll-state behavior has moved into `core-motion.js` and is bundled with `shopflow-core.js`.

## Releasing a new version

From the `shopflow` project root (the private repo):

```sh
sh code/build.sh                                   # 1. rebuild dist/
git add code && git commit -m "ShopFlow code vX.Y.Z" && git push
git subtree split --prefix=code -b shopflow-code   # 2. extract the code/ folder history
git tag vX.Y.Z shopflow-code                       # 3. tag the release
git push code shopflow-code:main                   # 4. publish (remote "code" = dmayes77/shopflow-code)
git push code vX.Y.Z
```

For version-pinned embeds, change `@vA.B.C` to `@vX.Y.Z` in Webflow and publish the site. A tag is permanent: never
move or reuse one; release a new number instead. Every ShopFlow jsDelivr embed (Page Shell core, cart drawer, mobile nav, product page and Shop All
collection filters) points to `@main`, so pushing rebuilt files to the public repo updates the storefront without another Webflow edit. The core
loader rotates its query key every five minutes to avoid a browser holding an obsolete branch build.

**After every push, purge jsDelivr's `@main` cache** – the rotating key only stops browsers caching; jsDelivr itself can
keep serving the previous `@main` build for up to ~12 hours. Open (or `curl`) the purge URL for each changed file:

```sh
for f in shopflow-core.js shopflow-core.css shopflow-cart-drawer.js shopflow-cart-drawer.css shopflow-pdp.js shopflow-pdp.css \
         shopflow-mobile-nav.js shopflow-mobile-nav.css shopflow-collection-filters.js shopflow-collection-filters.css; do
  curl -s "https://purge.jsdelivr.net/gh/dmayes77/shopflow-code@main/dist/$f" > /dev/null
done
```

Browsers then pick up the new core files within five minutes (the next loader key).
