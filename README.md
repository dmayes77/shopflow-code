# ShopFlow code

Readable source for every piece of custom code on the ShopFlow storefront (OYG Gameday proof of concept,
Webflow site `shopflow-mayesdigital`). Webflow holds the installed copies inside HTML embeds; these files are the
source of truth. When you change one, paste it back into the embed listed below (CSS inside `<style>`, JS inside
`<script>`) and bump the version in the file header.

Shopify stays the commerce engine. Storesynk does the product, variant, cart and filter logic; this code only adds
layout, behavior and accessibility on top of Storesynk's `sf-*` attributes.

## Where each file is installed

| File(s) | Version | Installed in Webflow | Layer |
|---|---|---|---|
| `shopflow-page-stability.css` | 1.0.0 | Page Shell › embed **ShopFlow Core Code** (section 0) | Core 2.0 candidate |
| `shopflow-sheet.css` / `.js` | 1.1.0 | Page Shell › embed **ShopFlow Core Code** (section 1) | Core 2.0 candidate |
| `shopflow-quick-add.css` / `.js` | 1.1.0 | Page Shell › embed **ShopFlow Core Code** (section 2) | ShopFlow |
| `shopflow-cart-page-bg.css` | 1.0.0 | Page Shell › embed **ShopFlow Core Code** (section 3) | ShopFlow |
| `shopflow-cart-drawer.css` / `.js` | 1.0.5 / 1.0.3 | Page Shell › cart embed **Popup CSS** | ShopFlow |
| `shopflow-mobile-nav.css` / `.js` | 1.0.1 | Navigation / OYG › embed **ShopFlow Mobile Nav Code** | ShopFlow |
| `shopflow-pdp.css` / `.js` | 1.2.6 | Products Template › embed **ShopFlow PDP Code** | ShopFlow |
| `shopflow-collection-filters.css` | 1.0.7 | Shop All › filters embed, `<style id="shopflow-collection-filters-css">` | ShopFlow |
| `shopflow-collection-filters.js` | 1.0.4 logic | Shop All › filters embed (minified). Skips its built-in CSS when the static style above exists. | ShopFlow |
| `shopflow-product-card-quick-add.css` | 1.1.0 | Product Card component (mobile "+" button) | ShopFlow |
| `shopflow-navbar-scroll.js` | 2.0.1 | Site footer custom code (registered script `shopflownavbarscroll`) | ShopFlow |
| `shopflow-product-card-images.js` | 1.1.0 | Site footer custom code (registered script `shopflowresponsiveimages`) | ShopFlow |
| `shopflow-wishlist.css` / `.js` | 1.0.1 | **Parked, not installed.** Kept for when the wishlist comes back. | ShopFlow |

**ShopFlow Core Code** is one embed in the Page Shell (loaded on every page) made of four files, in this order:
page stability → sheet → quick add → cart page background. The CSS parts go in one `<style>`, the JS parts in one `<script>`.

## Design decisions reflected in the code

- Shapes: no pill shapes on the storefront. Badges, buttons, size options and quantity boxes use Core 2.0
  `Radius/small` (`--_surface---radius--small`, 8px). Icon-only buttons (close ✕, share, cart count, card "+",
  cart delete) stay circles.
- Size buttons on the product page show S / M / L; Shopify keeps the full size names.
- Product page policies (shipping, returns, pickup, size chart) are placeholder copy for the proof of concept and
  live as editable text in the Products Template, not in code.
