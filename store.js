/**
 * WSC shared data layer — products & orders persisted to localStorage.
 * Used by catalogue.html (storefront) and admin.html (dashboard) so that
 * edits made in the admin panel are reflected on the storefront in this
 * same browser. There is no backend/database here — this is local to the
 * current browser only, not shared across visitors or devices.
 */

const WSC_PRODUCTS_KEY = 'wsc_products_v1';
const WSC_ORDERS_KEY = 'wsc_orders_v1';
const WSC_CART_KEY = 'wsc_cart_v1';

// Checkout hands each order to this WhatsApp number (country code + number, digits only).
const WSC_ORDER_WHATSAPP = '919971972588';

function wscOrderWhatsAppUrl(order) {
  const inr = n => '₹' + Number(n).toLocaleString('en-IN');
  const lines = [
    "Hello, I'd like to place an order with The White Shirt Company.",
    '',
    'Order ' + order.id,
    ...order.items.map(i => '- ' + i.name + ', size ' + i.size + ' x ' + i.qty + ': ' + inr(i.priceInr * i.qty)),
    'Total: ' + inr(order.totalInr),
    '',
    'Name: ' + order.customer.name,
    'Phone: ' + order.customer.phone,
    'Email: ' + order.customer.email,
    'Address: ' + order.customer.address,
  ];
  return 'https://wa.me/' + WSC_ORDER_WHATSAPP + '?text=' + encodeURIComponent(lines.join('\n'));
}

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
    priceInr: 2400,
    priceUsd: 29,
    discountPct: 0,
    inStock: true,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
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
    priceInr: 2800,
    priceUsd: 34,
    discountPct: 0,
    inStock: true,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
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
function wscLoadCart() {
  try { return JSON.parse(localStorage.getItem(WSC_CART_KEY)) || []; }
  catch (e) { return []; }
}

function wscSaveCart(cart) {
  localStorage.setItem(WSC_CART_KEY, JSON.stringify(cart));
}

function wscCartCount(cart) {
  return (cart || wscLoadCart()).reduce((s, i) => s + i.qty, 0);
}

function wscLoadOrders() {
  try { return JSON.parse(localStorage.getItem(WSC_ORDERS_KEY)) || []; }
  catch (e) { return []; }
}

function wscAddOrder(order) {
  const orders = wscLoadOrders();
  orders.unshift(order);
  localStorage.setItem(WSC_ORDERS_KEY, JSON.stringify(orders));
  return orders;
}

function wscClearOrders() {
  localStorage.removeItem(WSC_ORDERS_KEY);
}
