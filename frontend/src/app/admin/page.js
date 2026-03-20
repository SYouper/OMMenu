"use client";

import { useEffect, useState, useRef } from "react";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [newProduct, setNewProduct] = useState({ name: '', category: '', price: '', desc: '', image: '' });
  const [theme, setTheme] = useState("dark");
  const [settings, setSettings] = useState({ businessName: '', address: '', instagram: '', wifi: '', isOpen: true });
  const fullDbRef = useRef(null);

  const fetchDb = async () => {
    try {
      const res = await fetch('/api/sync');
      const cloudDb = await res.json();

      const localDbStr = localStorage.getItem('ommenu_db_admin');
      const localDb = localDbStr ? JSON.parse(localDbStr) : null;

      const cloudTime = cloudDb?.menuVersion || 0;
      const localTime = localDb?.menuVersion || 0;
      const cloudOrdersTime = cloudDb?.ordersVersion || 0;
      const localOrdersTime = localDb?.ordersVersion || 0;

      let mergedDb = { ...cloudDb };
      
      if (localTime > cloudTime) {
        mergedDb.products = localDb.products;
        mergedDb.settings = localDb.settings;
        mergedDb.menuVersion = localDb.menuVersion;
      }
      if (localOrdersTime > cloudOrdersTime) {
        mergedDb.orders = localDb.orders;
        mergedDb.clicks = localDb.clicks;
        mergedDb.notifications = localDb.notifications;
        mergedDb.ordersVersion = localDb.ordersVersion;
      }

      fullDbRef.current = mergedDb;
      localStorage.setItem('ommenu_db_admin', JSON.stringify(mergedDb));

      if (mergedDb.menuVersion > cloudTime || mergedDb.ordersVersion > cloudOrdersTime) {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'SYNC_MERGE', payload: mergedDb })
        });
      }

      const data = mergedDb;
      setProducts(data.products || []);
      setSettings(data.settings || { isOpen: true });
      setOrders(data.orders || []);
      setStats(data.clicks || {});
      
      if (data.notifications && data.notifications.length > 0) {
        data.notifications.forEach(n => {
          if (!notifications.find(existing => existing.id === n.id)) {
            addNotification(n.msg, n.id);
          }
        });
      }
    } catch (e) { console.error(e); }
  };

  const dispatchAction = async (action, payload) => {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload })
      });
      const data = await res.json();
      fullDbRef.current = data;
      localStorage.setItem('ommenu_db_admin', JSON.stringify(data));
      setProducts(data.products || []);
      setSettings(data.settings || { isOpen: true });
      setOrders(data.orders || []);
      setStats(data.clicks || {});
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDb();
    const interval = setInterval(fetchDb, 3000);

    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }

    return () => clearInterval(interval);
  }, [notifications]);

  const addNotification = (msg, id = Date.now()) => {
    setNotifications(prev => [...prev, { id, msg }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
      dispatchAction('CLEAR_NOTIFICATION', id);
    }, 6000); 
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const markComplete = (orderId) => {
    dispatchAction('COMPLETE_ORDER', orderId);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    await dispatchAction('ADD_PRODUCT', newProduct);
    setNewProduct({ name: '', category: '', price: '', desc: '', image: '' });
    addNotification('✅ Yeni ürün eklendi');
  };

  const handleDeleteProduct = async (id) => {
    await dispatchAction('DELETE_PRODUCT', id);
    addNotification('🗑️ Ürün menüden kaldırıldı');
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    await dispatchAction('UPDATE_SETTINGS', settings);
    addNotification('✅ Ayarlar güncellendi');
  };

  const handleStartDay = async () => {
    await dispatchAction('START_DAY');
    addNotification('☀️ Gün başlatıldı. Sipariş alımına açık!');
  };

  const handleEndDay = async () => {
    if (confirm("Günü bitirmek istediğinize emin misiniz? Tüm siparişler ve istatistikler sıfırlanacak.")) {
      await dispatchAction('END_DAY');
      addNotification('🌙 Gün bitirildi. Sipariş alımı kapatıldı.');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
      {/* Sidebar */}
      <aside className="admin-sidebar" style={{ zIndex: '100' }}>
        <h2 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '40px' }}>QR Dash</h2>
        <button className="theme-toggle" onClick={toggleTheme} style={{ position: 'absolute', top: '24px', right: '24px' }}>
          {theme === "light" ? "🌙" : "☀️"}
        </button>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button className={`btn ${currentTab === 'dashboard' ? 'btn-primary' : ''}`} onClick={() => setCurrentTab('dashboard')} style={{ justifyContent: 'flex-start', padding: '16px', background: currentTab === 'dashboard' ? '' : 'transparent', border: currentTab === 'dashboard' ? '' : 'none' }}>⏱️ Genel Bakış</button>
          <button className={`btn ${currentTab === 'menu' ? 'btn-primary' : ''}`} onClick={() => setCurrentTab('menu')} style={{ justifyContent: 'flex-start', padding: '16px', background: currentTab === 'menu' ? '' : 'transparent', border: currentTab === 'menu' ? '' : 'none' }}>🍔 Menü Yönetimi</button>
          <button className={`btn ${currentTab === 'settings' ? 'btn-primary' : ''}`} onClick={() => setCurrentTab('settings')} style={{ justifyContent: 'flex-start', padding: '16px', background: currentTab === 'settings' ? '' : 'transparent', border: currentTab === 'settings' ? '' : 'none' }}>⚙️ İşletme Ayarları</button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="admin-main" style={{ flexGrow: 1 }}>
        {currentTab === 'dashboard' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <div>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Genel Bakış</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Bugünkü performansı anlık takip et.</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                {!settings.isOpen ? (
                  <button className="btn btn-primary" onClick={handleStartDay} style={{ background: 'var(--success)', border: 'none' }}>
                    ☀️ Günü Başlat (Satışa Aç)
                  </button>
                ) : (
                  <button className="btn btn-danger" onClick={handleEndDay}>
                    🌙 Günü Bitir (Verileri Sıfırla)
                  </button>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4" style={{ marginBottom: '40px' }}>
              <div className="glass-panel stat-card">
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase' }}>Toplam Sipariş</div>
                <div className="stat-value">{orders.length}</div>
              </div>
              <div className="glass-panel stat-card">
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase' }}>Ciro (₺)</div>
                <div className="stat-value gradient-text">
                  {orders.reduce((sum, o) => sum + o.total, 0)}₺
                </div>
              </div>
              <div className="glass-panel stat-card">
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase' }}>Müşteri İlgisi (Tık)</div>
                <div className="stat-value">{Object.values(stats).reduce((a, b) => a + b, 0)}</div>
              </div>
              <div className="glass-panel stat-card">
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase' }}>Hazırlanıyor</div>
                <div className="stat-value" style={{ color: 'var(--danger)' }}>
                  {orders.filter(o => o.status === 'bekliyor').length}
                </div>
              </div>
            </div>

            {/* Dashboard Columns */}
            <div className="grid grid-cols-2" style={{ gap: '32px', gridTemplateColumns: '2fr 1fr' }}>
              
              {/* Active Orders Section */}
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
                  Bekleyen Siparişler
                </h2>
                {!settings.isOpen ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                    Kapalıyız. Bekleyen sipariş yok.
                  </div>
                ) : orders.filter(o => o.status === 'bekliyor').length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                    🎉 Bekleyen sipariş yok. Harika iş çıkarıyorsun!
                  </div>
                ) : (
                  orders.filter(o => o.status === 'bekliyor').map((order) => (
                    <div key={order.id} className="glass-panel order-card animate-fade-in">
                      <div className="order-header">
                        <div>
                          <span style={{ fontWeight: '700', fontSize: '1.25rem', color: 'var(--text-primary)' }}>Masa {order.tableId}</span>
                          <span style={{ marginLeft: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {new Date(order.time).toLocaleTimeString()}
                          </span>
                        </div>
                        <span style={{ fontWeight: '700', color: 'var(--danger)' }}>{order.total}₺</span>
                      </div>
                      <div style={{ marginBottom: '20px' }}>
                        <ul style={{ listStylePosition: 'inside', paddingLeft: '8px', lineHeight: '1.8' }}>
                          {order.items.map((item, i) => (
                            <li key={i}>{item.name}</li>
                          ))}
                        </ul>
                      </div>
                      <button className="btn btn-primary" onClick={() => markComplete(order.id)} style={{ width: '100%', borderRadius: '8px' }}>
                        ✅ Teslim Edildi / Tamamla
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Analytics / Click Stats Section */}
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
                  Popüler Ürünler
                </h2>
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
                    Müşterilerin en çok incelediği ürünlerin anlık tıklanma oranları.
                  </p>
                  
                  {products.sort((a, b) => (stats[b.id] || 0) - (stats[a.id] || 0)).map((product) => {
                    const clickCount = stats[product.id] || 0;
                    if (clickCount === 0) return null; // Show clicked only
                    const maxClicks = Math.max(...Object.values(stats), 1);
                    const percent = (clickCount / maxClicks) * 100;

                    return (
                      <div key={product.id} style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.95rem' }}>
                          <span>{product.name}</span>
                          <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{clickCount} k.</span>
                        </div>
                        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ 
                            background: 'var(--text-primary)',
                            height: '100%', 
                            width: `${percent}%`,
                            transition: 'width 0.5s ease' 
                          }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentTab === 'menu' && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: '32px' }}>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Menü Yönetimi</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Yeni ürün, içecek veya ekstra ekle/çıkar.</p>
            </div>

            <div className="grid grid-cols-2" style={{ gap: '32px', gridTemplateColumns: '1fr 2fr' }}>
              <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>Yeni Ürün Ekle</h2>
                <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <input className="input-field" placeholder="Ürün Adı" required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                  <input className="input-field" placeholder="Kategori (örn: İçecek, Tatlı)" required value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} />
                  <input className="input-field" placeholder="Fiyat (₺)" type="number" required value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                  <input className="input-field" placeholder="Görsel URL (İsteğe Bağlı)" type="url" value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})} />
                  <textarea className="input-field" placeholder="Açıklama / İçindekiler..." rows="3" value={newProduct.desc} onChange={e => setNewProduct({...newProduct, desc: e.target.value})} />
                  <button type="submit" className="btn btn-primary" style={{ padding: '12px', marginTop: '8px' }}>Menüye Ekle</button>
                </form>
              </div>

              <div className="glass-panel" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>Aktif Menü</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {products.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {p.image && <img src={p.image} alt={p.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }} />}
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '1.05rem' }}>{p.name} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>{p.category}</span></div>
                          <div style={{ color: 'var(--success)', fontWeight: '500' }}>{p.price}₺</div>
                        </div>
                      </div>
                      <button className="btn btn-danger" onClick={() => handleDeleteProduct(p.id)} style={{ padding: '8px 16px' }}>Sil</button>
                    </div>
                  ))}
                  {products.length === 0 && <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>Menüde henüz ürün yok.</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentTab === 'settings' && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: '32px' }}>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>İşletme Ayarları</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Farklı işletmelere göre müşteri panelini özelleştirin.</p>
            </div>

            <div className="glass-panel" style={{ padding: '32px', maxWidth: '600px' }}>
              <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>İşletme / Restoran Adı</label>
                  <input className="input-field" required value={settings.businessName || ''} onChange={e => setSettings({...settings, businessName: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Adres / Konum Detayı</label>
                  <input className="input-field" value={settings.address || ''} onChange={e => setSettings({...settings, address: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Instagram Kullanıcı Adı</label>
                  <input className="input-field" placeholder="@" value={settings.instagram || ''} onChange={e => setSettings({...settings, instagram: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Wi-Fi Şifresi</label>
                  <input className="input-field" value={settings.wifi || ''} onChange={e => setSettings({...settings, wifi: e.target.value})} />
                </div>
                
                <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '12px 0' }} />
                
                <button type="submit" className="btn btn-primary" style={{ padding: '14px', fontSize: '1.1rem' }}>Ayarları Kaydet</button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Notifications */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {notifications.map(n => (
          <div key={n.id} className="glass-panel animate-fade-in" style={{ 
            padding: '16px 24px', 
            background: 'var(--card-bg)', 
            borderLeft: '4px solid var(--text-primary)',
            minWidth: '300px',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{ fontWeight: '500', fontSize: '1rem' }}>{n.msg}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
