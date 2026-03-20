"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '40px', maxWidth: '600px', width: '100%' }}>
        <h1 className="gradient-text" style={{ fontSize: '3rem', marginBottom: '16px' }}>QR Menü+</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '1.2rem' }}>
          Yeni nesil dijital menü, sipariş ve restoran yönetim sistemi.
        </p>
        
        <div className="grid grid-cols-2" style={{ gap: '16px' }}>
          <button 
            className="btn btn-primary" 
            onClick={() => router.push('/1')}
            style={{ padding: '16px', fontSize: '1.1rem' }}
          >
            Masa 1 (Müşteri)
          </button>
          
          <button 
            className="btn" 
            onClick={() => router.push('/admin')}
            style={{ padding: '16px', fontSize: '1.1rem' }}
          >
            Yönetim Paneli
          </button>
        </div>
      </div>
    </div>
  );
}
