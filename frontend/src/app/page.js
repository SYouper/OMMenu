import { redirect } from 'next/navigation';

export default function Home() {
  // Direkt masa 1'e yönlendir, böylece şık seçme ekranı kaybolur.
  redirect('/1');
}
