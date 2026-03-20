import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const defaultDb = {
  lastModified: Date.now(),
  products: [
    { id: 1, name: 'Taze Filtre Kahve', category: 'Kahveler', price: 95, desc: 'Günlük demlenmiş Kolombiya', image: 'https://images.unsplash.com/photo-1544148103-0773bf10d330' },
    { id: 2, name: 'Latte', category: 'Kahveler', price: 120, desc: 'Yumuşak içimli sütlü espresso', image: 'https://images.unsplash.com/photo-1544148103-0773bf10d330' },
    { id: 3, name: 'San Sebastian', category: 'Tatlılar', price: 180, desc: 'Akışkan İspanyol çikolatası ile', image: 'https://images.unsplash.com/photo-1544148103-0773bf10d330' }
  ],
  orders: [],
  clicks: { 1: 5, 2: 12, 3: 8 },
  settings: {
    businessName: 'OM Cafe & Restoran',
    address: 'Merkez Sok. No: 15 / B',
    instagram: '@omcafe',
    wifi: 'omcafe123',
    isOpen: true
  },
  notifications: []
};

// Global fallback for Vercel serverless functions
if (!global.appDb) {
  global.appDb = JSON.parse(JSON.stringify(defaultDb));
}

export async function GET() {
  return NextResponse.json(global.appDb);
}

export async function POST(req) {
  try {
    const { action, payload } = await req.json();
    let db = global.appDb;

    // Vercel Lambda State Gossip Sync Fix:
    if (action === 'OVERWRITE_DB') {
      if (payload.lastModified > db.lastModified) {
        global.appDb = payload;
      }
      return NextResponse.json(global.appDb);
    }

    // Ensure we update timestamp for every mutation
    db.lastModified = Date.now();

    if (action === 'ADD_PRODUCT') {
      const newProduct = { id: Date.now(), ...payload };
      db.products.push(newProduct);
      db.clicks[newProduct.id] = 0;
    } 
    else if (action === 'DELETE_PRODUCT') {
      db.products = db.products.filter(p => p.id !== payload);
      delete db.clicks[payload];
    } 
    else if (action === 'NEW_ORDER') {
      const order = { id: Date.now(), time: new Date().toISOString(), status: 'bekliyor', ...payload };
      db.orders.push(order);
      db.notifications.push({ id: Date.now(), msg: `🛍️ Masa ${payload.tableId} sipariş verdi! (${payload.total}₺)` });
    } 
    else if (action === 'COMPLETE_ORDER') {
      const order = db.orders.find(o => o.id === payload);
      if (order) order.status = 'hazır';
    } 
    else if (action === 'UPDATE_SETTINGS') {
      db.settings = { ...db.settings, ...payload };
    } 
    else if (action === 'START_DAY') {
      db.settings.isOpen = true;
    } 
    else if (action === 'END_DAY') {
      db.settings.isOpen = false;
      db.orders = [];
      Object.keys(db.clicks).forEach(k => db.clicks[k] = 0);
    } 
    else if (action === 'RECORD_CLICK') {
      db.clicks[payload] = (db.clicks[payload] || 0) + 1;
    } 
    else if (action === 'CALL_WAITER') {
      db.notifications.push({ id: Date.now(), msg: `🛎️ Masa ${payload} garson çağırıyor!` });
    }
    else if (action === 'CLEAR_NOTIFICATION') {
      db.notifications = db.notifications.filter(n => n.id !== payload);
    }

    return NextResponse.json(db);
  } catch (err) {
    return NextResponse.json(global.appDb);
  }
}
