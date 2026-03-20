const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For development
    methods: ['GET', 'POST']
  }
});

// --- IN MEMORY DATABASE --- //
const products = [
  { id: 1, name: 'Espresso', category: 'Kahveler', price: 60, image: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&q=80&w=400', desc: 'Sert ve yoğun.' },
  { id: 2, name: 'Latte', category: 'Kahveler', price: 85, image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=400', desc: 'Bol sütlü.' },
  { id: 3, name: 'Tiramisu', category: 'Tatlılar', price: 110, image: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&q=80&w=400', desc: 'Orijinal İtalyan tarifi.' },
  { id: 4, name: 'Cheesecake', category: 'Tatlılar', price: 120, image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&q=80&w=400', desc: 'Böğürtlen soslu.' },
  { id: 5, name: 'Limonata', category: 'Soğuk İçecekler', price: 70, image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400', desc: 'Ev yapımı, naneli.' }
];

let orders = [];
let clicks = {}; // e.g. { "1": 5, "2": 2 } - id: count

// Initialize click counts based on products
products.forEach(p => {
  clicks[p.id] = 0;
});

let settings = {
  businessName: 'OM Cafe & Restaurant',
  address: 'Merkez Mah. Kahve Sok.',
  instagram: '@omcafe',
  wifi: 'omcafe123',
  isOpen: true
};

// --- REST API ROUTES --- //
app.get('/api/settings', (req, res) => {
  res.json(settings);
});

app.post('/api/settings', (req, res) => {
  settings = { ...settings, ...req.body };
  io.emit('settings_updated', settings);
  res.json(settings);
});

app.post('/api/start-day', (req, res) => {
  settings.isOpen = true;
  io.emit('settings_updated', settings);
  res.json({ success: true });
});

app.post('/api/end-day', (req, res) => {
  settings.isOpen = false;
  orders = [];
  Object.keys(clicks).forEach(k => clicks[k] = 0);
  io.emit('settings_updated', settings);
  io.emit('stats_updated', clicks);
  // Optional: clear orders on clients too
  io.emit('day_ended'); 
  res.json({ success: true });
});

app.get('/api/products', (req, res) => {
  res.json(products);
});

app.post('/api/products', (req, res) => {
  const { name, category, price, image, desc } = req.body;
  const newProduct = {
    id: Date.now(), // simple unique id
    name,
    category,
    price: Number(price),
    image: image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400',
    desc
  };
  products.push(newProduct);
  clicks[newProduct.id] = 0; // initialize stats
  
  io.emit('menu_updated', products); // Notify all clients
  res.status(201).json(newProduct);
});

app.delete('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = products.findIndex(p => p.id === id);
  if (index !== -1) {
    products.splice(index, 1);
    delete clicks[id];
    io.emit('menu_updated', products);
    res.status(200).json({ success: true });
  } else {
    res.status(404).json({ error: 'Product not found' });
  }
});

app.get('/api/orders', (req, res) => {
  res.json(orders);
});

app.get('/api/stats', (req, res) => {
  res.json(clicks);
});

// --- SOCKET.IO EVENTS --- //
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Customer calls waiter
  socket.on('call_waiter', (data) => {
    const tableId = data.tableId;
    console.log(`Table ${tableId} is calling the waiter!`);
    // Broadcast to all admin clients
    io.emit('waiter_called', { tableId, time: new Date().toISOString() });
  });

  // Customer records a click on a product
  socket.on('record_click', (data) => {
    const productId = data.productId;
    if (clicks[productId] !== undefined) {
      clicks[productId] += 1;
      console.log(`Product ${productId} clicked, total: ${clicks[productId]}`);
      // Notify admin of stat update
      io.emit('stats_updated', clicks);
    }
  });

  // Customer places a new order
  socket.on('new_order', (data) => {
    const { tableId, items, total } = data;
    const newOrder = {
      id: orders.length + 1,
      tableId,
      items,
      total,
      status: 'bekliyor',
      time: new Date().toISOString()
    };
    orders.push(newOrder);
    console.log(`New order from Table ${tableId}:`, newOrder);
    
    // Notify admin
    io.emit('order_received', newOrder);
  });

  // Admin marks an order as completed
  socket.on('complete_order', (data) => {
    const orderId = data.orderId;
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      orders[orderIndex].status = 'hazır';
      io.emit('order_updated', orders[orderIndex]);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = 3001; // Backend on 3001, Frontend on 3000
server.listen(PORT, () => {
  console.log(`Backend Server running on port ${PORT}`);
});
