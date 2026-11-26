/**
 * WSC shared data layer, loaded by every page.
 * - Products and the cart live in this browser's localStorage.
 *   Product edits made in admin.html apply only in the browser they were made in.
 * - Orders are sent to the order server (orders-api/ in this project, hosted on Vercel)
 *   and are reviewed and approved in admin.html.
 */

const WSC_PRODUCTS_KEY = 'wsc_products_v2'; // v2: new prices and XXXL; ignores product edits saved under v1
const WSC_CART_KEY = 'wsc_cart_v1';

// Order server. Prices charged at checkout are also set there (orders-api/lib/shared.js).
const WSC_API_BASE = 'https://wsc-orders.vercel.app';

// UPI account that receives payments; matches website_images/upi-qr.png.
const WSC_UPI = { id: '8168318654@kotak', payee: 'THE WHITE SHIRT COMPANY' };

const WSC_DEFAULT_PRODUCTS = [
  {
    id: 'cotton-shirt',
    name: 'Cotton White Shirt',
    desc: 'Crisp, long-staple cotton poplin — structured and breathable.',
    gallery: [
      'catalogue/cotton%20shirt/cotton_shirt%20(4).jpeg',
      'catalogue/cotton%20shirt/cotton_shirt%20(3).jpeg',
      'catalogue/cotton%20shirt/cotton_shirt%20(1).jpeg',
      'catalogue/cotton%20shirt/cotton_shirt_men.jpg',
      'catalogue/cotton%20shirt/cotton_shirt%20(2).jpeg',
    ],
    priceInr: 1200,
    priceUsd: 15,
    discountPct: 0,
    inStock: true,
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXXL'],
  },
  {
    id: 'linen-shirt',
    name: 'Linen White Shirt',
    desc: 'Softly textured European linen — light, airy, unhurried.',
    gallery: [
      'catalogue/Linen_shirt/linen_shirt_6.jpeg',
      'catalogue/Linen_shirt/linen_shirt_4.jpeg',
      'catalogue/Linen_shirt/linen_shirt_5.jpeg',
      'catalogue/Linen_shirt/linen_shirt_2.jpeg',
      'catalogue/Linen_shirt/linen_shirt_3.jpeg',
      'catalogue/Linen_shirt/linen_shirt_men.jpg',
    ],
    priceInr: 2100,
    priceUsd: 25,
    discountPct: 0,
    inStock: true,
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXXL'],
  },
];

function wscLoadProducts() {
  try {
    const raw = localStorage.getItem(WSC_PRODUCTS_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      // Merge saved edits over defaults so newly added default fields never go missing.
      const merged = WSC_DEFAULT_PRODUCTS.map(def => {
        const match = saved.find(s => s.id === def.id);
        return match ? { ...def, ...match } : { ...def };
      });
      // Preserve any admin-created products that aren't part of the defaults.
      const customs = saved.filter(s => !WSC_DEFAULT_PRODUCTS.some(def => def.id === s.id));
      return merged.concat(customs.map(c => ({ ...c })));
    }
  } catch (e) { /* fall through to defaults */ }
  return JSON.parse(JSON.stringify(WSC_DEFAULT_PRODUCTS));
}

function wscSaveProducts(products) {
  localStorage.setItem(WSC_PRODUCTS_KEY, JSON.stringify(products));
}

function wscResetProducts() {
  localStorage.removeItem(WSC_PRODUCTS_KEY);
}

function wscDiscountedPrice(price, pct) {
  const p = Number(price) || 0;
  const d = Math.min(90, Math.max(0, Number(pct) || 0));
  return Math.round(p * (1 - d / 100));
}

function wscSlugify(name) {
  return String(name).toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'product';
}

function wscUniqueProductId(name, existingProducts) {
  const base = wscSlugify(name);
  let id = base;
  let n = 2;
  while (existingProducts.some(p => p.id === id)) {
    id = base + '-' + n;
    n += 1;
  }
  return id;
}

// ── CART (shared across every page so a visitor's cart survives navigation) ──
// Items are re-priced from the current product list on every load, so a cart saved
// before a price change never shows or charges the old price.
function wscLoadCart() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(WSC_CART_KEY)) || []; }
  catch (e) { saved = []; }
  const products = wscLoadProducts();
  return saved
    .map(item => {
      const product = products.find(p => p.id === item.id);
      if (!product) return null;
      return { ...item, name: product.name, priceInr: wscDiscountedPrice(product.priceInr, product.discountPct), priceUsd: product.priceUsd };
    })
    .filter(Boolean);
}

function wscSaveCart(cart) {
  localStorage.setItem(WSC_CART_KEY, JSON.stringify(cart));
}

function wscCartCount(cart) {
  return (cart || wscLoadCart()).reduce((s, i) => s + i.qty, 0);
}

// ── ORDERS ──
// Order reference shown to the customer and added to the UPI payment note.
function wscNewOrderId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return 'WSC-' + Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
}

// Opens a UPI app with the payee, amount and order reference filled in (phones only).
function wscUpiPayUrl(amountInr, orderId) {
  return 'upi://pay?pa=' + WSC_UPI.id
    + '&pn=' + encodeURIComponent(WSC_UPI.payee)
    + '&am=' + Number(amountInr).toFixed(2)
    + '&cu=INR&tn=' + encodeURIComponent('Order ' + orderId);
}

async function wscSubmitOrder(payload) {
  const response = await fetch(WSC_API_BASE + '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}
