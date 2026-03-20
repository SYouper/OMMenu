import './globals.css';

export const metadata = {
  title: 'QR Menü & Sipariş',
  description: 'Dijital Menü ve Sipariş Yönetim Sistemi',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
