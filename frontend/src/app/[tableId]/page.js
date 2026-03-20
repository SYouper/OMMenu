"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";

export default function CustomerMenu() {
  const { tableId } = useParams();
  
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({ 
    businessName: '', address: '', instagram: '', wifi: '', isOpen: true 
  });
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState("dark"); // Default to dark for sleek pro look
  const fullDbRef = useRef(null);

  // Sync with API
  const fetchDb = async () => {
    try {
      const res = await fetch('/api/sync');
      const cloudDb = await res.json();

      const localDbStr = localStorage.getItem('ommenu_db_admin');
      const localDb = localDbStr ? JSON.parse(localDbStr) : null;

      const cloudTime = cloudDb?.lastModified || 0;
      const localTime = localDb?.lastModified || 0;

      const mostRecentDb = localTime > cloudTime ? localDb : cloudDb;

      fullDbRef.current = mostRecentDb;
      localStorage.setItem('ommenu_db_admin', JSON.stringify(mostRecentDb));

      if (mostRecentDb === localDb && localTime > cloudTime) {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'OVERWRITE_DB', payload: mostRecentDb })
        });
      }

      setProducts(mostRecentDb.products || []);
      setSettings(mostRecentDb.settings || { isOpen: true });
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
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDb();
    const interval = setInterval(fetchDb, 3000); // Poll every 3 seconds for updates

    // Load theme
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }

    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const recordClick = (productId) => {
    dispatchAction('RECORD_CLICK', productId);
  };

  const addToCart = (product) => {
    recordClick(product.id);
    setCart([...cart, product]);
    showToast(`${product.name} eklendi`);
  };

  const removeFromCart = (index) => {
    const updatedCart = [...cart];
    updatedCart.splice(index, 1);
    setCart(updatedCart);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price, 0);
  };

  const callWaiter = () => {
    dispatchAction('CALL_WAITER', tableId);
    showToast("Garson çağrıldı!");
  };

  const placeOrder = () => {
    if (cart.length === 0) return;
    
    dispatchAction('NEW_ORDER', {
      tableId,
      items: cart,
      total: getCartTotal()
    });
    
    setCart([]);
    setIsCartOpen(false);
    setIsConfirmed(false);
    showToast("Siparişiniz alındı.");
  };

  // Prevent ordering if closed
  if (!settings.isOpen) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center' }}>
        <div>
          <h1 style={{ marginBottom: '16px', fontSize: '2rem' }}>Şu An Kapalıyız</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Masa {tableId} - Gün sonu yapılmıştır. İlginiz için teşekkürler.</p>
        </div>
      </div>
    );
  }

  // Filter Categories
  const groupedProducts = products.reduce((acc, product) => {
    if (!acc[product.category]) acc[product.category] = [];
    acc[product.category].push(product);
    return acc;
  }, {});

  // Search logic
  const filteredProductsBySearch = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '100px' }}>
      
      {/* Sleek App Header */}
      <div className="app-header">
        <div>
          <div className="app-business-name">{settings.businessName || "OM Restoran"}</div>
          <div className="app-business-info">
            {settings.address && <span>{settings.address}</span>}
            {settings.instagram && <span style={{ marginLeft: '8px' }}>• {settings.instagram}</span>}
          </div>
          {settings.wifi && (
            <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              📶 Wi-Fi: {settings.wifi}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="app-search">
        <span className="app-search-icon">🔍</span>
        <input 
          type="text" 
          className="input-field" 
          placeholder="Ara..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* If Searching, show direct products */}
      {searchQuery.length > 0 ? (
        <div>
          <h2 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>Arama Sonuçları</h2>
          <div className="grid grid-cols-2">
            {filteredProductsBySearch.map(product => (
              <div key={product.id} className="product-card" onClick={() => recordClick(product.id)}>
                <img src={product.image} alt={product.name} className="product-img" />
                <div className="product-info">
                  <div className="product-title">{product.name}</div>
                  <div className="product-desc">{product.desc}</div>
                  <div className="product-footer">
                    <span className="product-price">{product.price}₺</span>
                    <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); addToCart(product); }}>Ekle</button>
                  </div>
                </div>
              </div>
            ))}
            {filteredProductsBySearch.length === 0 && (
              <div style={{ color: 'var(--text-secondary)' }}>Ürün bulunamadı.</div>
            )}
          </div>
        </div>
      ) : (
        /* If Not Searching, show Category Flow */
        <>
          {!selectedCategory ? (
            <div>
              {/* Category Toggles */}
              <div className="category-tab-bar">
                <button className="category-tab active">Tümü</button>
                {Object.keys(groupedProducts).map(cat => (
                  <button key={cat} className="category-tab" onClick={() => setSelectedCategory(cat)}>
                    {cat}
                  </button>
                ))}
              </div>

              {/* Sleek Image Grid Categories */}
              <div className="grid grid-cols-2">
                {Object.keys(groupedProducts).map(category => {
                  const firstImage = groupedProducts[category][0]?.image || "https://images.unsplash.com/photo-1544148103-0773bf10d330";
                  return (
                    <div key={category} className="category-block-card animate-fade-in" onClick={() => setSelectedCategory(category)}>
                      <div className="category-block-bg" style={{ backgroundImage: `url(${firstImage})` }}></div>
                      <div className="category-block-title">{category}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <button 
                  className="btn" 
                  style={{ padding: '6px 12px' }}
                  onClick={() => setSelectedCategory(null)}
                >
                  ← Geri
                </button>
                <h2 style={{ fontSize: '1.3rem', margin: 0 }}>{selectedCategory}</h2>
              </div>
              
              <div className="grid grid-cols-2">
                {groupedProducts[selectedCategory].map(product => (
                  <div key={product.id} className="product-card" onClick={() => recordClick(product.id)}>
                    <img src={product.image} alt={product.name} className="product-img" />
                    <div className="product-info">
                      <div className="product-title">{product.name}</div>
                      <div className="product-desc">{product.desc}</div>
                      <div className="product-footer">
                        <span className="product-price">{product.price}₺</span>
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                          onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                        >
                          Ekle
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="cart-drawer-overlay" onClick={(e) => { if (e.target.className === 'cart-drawer-overlay') setIsCartOpen(false); }}>
          <div className="cart-drawer">
            <div className="cart-header">
              <h2>Siparişiniz</h2>
              <button className="btn" onClick={() => setIsCartOpen(false)} style={{ padding: '6px 12px' }}>Kapat</button>
            </div>
            
            <div className="cart-body">
              {cart.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '40px' }}>Sepetiniz boş</div>
              ) : (
                cart.map((item, index) => (
                  <div key={index} className="cart-item">
                    <div>
                      <div className="cart-item-name">{item.name}</div>
                      <div className="cart-item-price">{item.price}₺</div>
                    </div>
                    <button className="cart-item-remove" onClick={() => removeFromCart(index)}>×</button>
                  </div>
                ))
              )}
            </div>
            
            <div style={{ padding: '24px', borderTop: '1px solid var(--card-border)', background: 'var(--card-bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '1.1rem', fontWeight: '600' }}>
                <span>Toplam:</span>
                <span className="gradient-text">{getCartTotal()}₺</span>
              </div>
              
              {cart.length > 0 && (
                <label className="confirm-checkbox-container">
                  <input type="checkbox" checked={isConfirmed} onChange={(e) => setIsConfirmed(e.target.checked)} />
                  <span style={{ fontSize: '0.9rem' }}>Siparişi onaylıyorum</span>
                </label>
              )}

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '14px', fontSize: '1.05rem' }}
                onClick={placeOrder}
                disabled={cart.length === 0 || !isConfirmed}
              >
                Siparişi Ver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast">
          {toastMessage}
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <button className="mobile-nav-btn" onClick={() => { setSelectedCategory(null); setSearchQuery(''); }}>
          <span style={{ fontSize: '1.2rem', marginBottom: '4px' }}>☰</span>
          Menü
        </button>
        <button className="mobile-nav-btn" onClick={callWaiter}>
          <span style={{ fontSize: '1.2rem', marginBottom: '4px' }}>🔔</span>
          Garson
        </button>
        <button className="mobile-nav-btn" onClick={() => setIsCartOpen(true)} style={{ position: 'relative' }}>
          <span style={{ fontSize: '1.2rem', marginBottom: '4px' }}>🛒</span>
          Sepet
          {cart.length > 0 && <span className="cart-badge">{cart.length}</span>}
        </button>
      </nav>
      
      {/* Desktop Quick Actions */}
      <div className="desktop-header-actions" style={{ position: 'fixed', bottom: '30px', right: '30px', display: 'flex', gap: '16px', zIndex: 100 }}>
        <button className="btn btn-primary" onClick={() => setIsCartOpen(true)} style={{ padding: '16px 24px', borderRadius: '50px', boxShadow: 'var(--shadow-md)' }}>
          🛒 Sepet {cart.length > 0 && `(${cart.length})`}
        </button>
        <button className="btn" onClick={callWaiter} style={{ padding: '16px', borderRadius: '50px', background: 'var(--card-bg)', boxShadow: 'var(--shadow-md)' }}>
          🔔 Garson
        </button>
      </div>

    </div>
  );
}
