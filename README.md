# ShopFlow code

Source for every piece of custom code on the ShopFlow storefront (OYG Gameday proof of concept, Webflow site
`shopflow-mayesdigital`). These files are the source of truth. The public repo **dmayes77/shopflow-code** is this
folder, published from the private `shopflow` project repo; the storefront loads the files in `dist/` from it through
jsDelivr, pinned to a version tag.

Shopify stays the commerce engine. Storesynk does the product, variant, cart and filter logic; this code only adds
layout, behavior and accessibility on top of Storesynk's `sf-*` attributes.

## Where each file is used

| File(s) | Version | Installed in Webflow | Layer |
|---|---|---|---|
| `shopflow-page-stability.css` | 1.0.0 | Page Shell › embed **ShopFlow Core Code** (section 0) | Core 2.0 candidate |
| `shopflow-sheet.css` / `.js` | 1.2.0 | Page Shell › embed **ShopFlow Core Code** (section 1) – the shared drawer | Core 2.0 candidate |
| `shopflow-quick-add.css` / `.js` | 1.1.0 / 1.1.1 | Page Shell › embed **ShopFlow Core Code** (section 2) | ShopFlow |
| `shopflow-cart-page-bg.css` | 1.0.0 | Page Shell › embed **ShopFlow Core Code** (section 3) | ShopFlow |
| `shopflow-cart-drawer.css` / `.js` | 1.0.5 / 1.0.3 | Page Shell › cart embed **Popup CSS** | ShopFlow |
| `shopflow-mobile-nav.css` / `.js` | 1.0.1 / 1.0.2 | Navigation / OYG › embed **ShopFlow Mobile Nav Code** | ShopFlow |
| `shopflow-pdp.css` / `.js` | 1.2.7 / 1.2.6 | Products Template › embed **ShopFlow PDP Code** | ShopFlow |
| `shopflow-collection-filters.css` | 1.0.7 | Shop All › filters embed (`<link id="shopflow-collection-filters-css">`) | ShopFlow |
| `shopflow-collection-filters.js` | 1.0.7 | Shop All › filters embed | ShopFlow |
| `shopflow-product-card-quick-add.css` | 1.1.0 | Product Card component (mobile "+" button) | ShopFlow |
| `shopflow-navbar-scroll.js` | 2.0.1 | Site footer custom code (registered script `shopflownavbarscroll`) | ShopFlow |
| `shopflow-product-card-images.js` | 1.1.0 | Site footer custom code (registered script `shopflowresponsiveimages`) | ShopFlow |
| `shopflow-wishlist.css` / `.js` | 1.0.1 | **Parked, not installed.** Kept for when the wishlist comes back. | ShopFlow |

**ShopFlow Core Code** is one embed in the Page Shell (loaded on every page) made of four files, in this order:
page stability → sheet → quick add → cart page background. The CSS parts go in one `<style>`, the JS parts in one `<script>`.

## The shared drawer (Sheet v1.2.0)

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

Modes: `auto` (bottom sheet on phones, centered dialog on desktop), `bottom`, `center`, `left`, `right`.
Not in the shared drawer, on purpose:
- **Cart** – Storesynk's own popup (`[sf-cart-popup]`); Storesynk opens it after add-to-cart. Styled to match.
- **Collection filters** – must stay inside the Storesynk collection (`[sf-collection]`) to keep filtering; it is
  a sidebar on desktop and slides in on phones (`shopflow-collection-filters`).

New drawer content (search, recently viewed, complete the look, store info…) = a new block + a trigger, no new code
for the drawer itself.

## Design decisions reflected in the code

- Shapes: no pill shapes on the storefront. Badges, buttons, size options and quantity boxes use Core 2.0
  `Radius/small` (`--_surface---radius--small`, 8px). Icon-only buttons (close ✕, share, cart count, card "+",
  cart delete) stay circles.
- Size buttons on the product page show S / M / L; Shopify keeps the full size names.
- Product page policies (shipping, returns, pickup, size chart) are placeholder copy for the proof of concept and
  live as editable text in the Products Template, not in code.

## Folder layout

- `javascript/` – the sources you edit (one feature per file, version in each file header).
- `dist/` – what Webflow loads. Built by `sh build.sh`; never edit by hand.
  - `shopflow-core.css` / `.js` = page stability + sheet + quick add + cart page background (every page).
  - `shopflow-pdp`, `shopflow-cart-drawer`, `shopflow-mobile-nav`, `shopflow-collection-filters` (`.css` / `.js`).
- `build.sh` – rebuilds `dist/`.

## How the storefront loads it

Each Webflow embed is two lines, pinned to one release tag (example for the product page):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/dmayes77/shopflow-code@v1.0.0/dist/shopflow-pdp.css">
<script defer src="https://cdn.jsdelivr.net/gh/dmayes77/shopflow-code@v1.0.0/dist/shopflow-pdp.js"></script>
```

| Webflow embed | Loads |
|---|---|
| Page Shell › **ShopFlow Core Code** | `dist/shopflow-core.css`, `dist/shopflow-core.js` |
| Page Shell › cart embed **Popup CSS** | `dist/shopflow-cart-drawer.css`, `.js` |
| Navigation / OYG › **ShopFlow Mobile Nav Code** | `dist/shopflow-mobile-nav.css`, `.js` |
| Products Template › **ShopFlow PDP Code** | `dist/shopflow-pdp.css`, `.js` |
| Shop All › filters embed | `dist/shopflow-collection-filters.css` (the `<link>` keeps `id="shopflow-collection-filters-css"`), `.js` |

Not on jsDelivr (yet): the Product Card component embeds (`shopflow-product-card-quick-add.css`) and the two site
footer scripts (`shopflow-navbar-scroll.js`, `shopflow-product-card-images.js`), which are registered in Webflow.

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

Then change `@vA.B.C` to `@vX.Y.Z` in the Webflow embeds and publish the site. A tag is permanent: never move
or reuse one; release a new number instead. The old version keeps working until the embeds are switched, so
rolling back is just switching the tag back.
