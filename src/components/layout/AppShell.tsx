import { getCurrentMember } from '@/lib/auth';
import Sidebar from './Sidebar';
import Header from './Header';
import MainNav from './MainNav';

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember();
  const locale = 'de';
  const isAdmin = member?.role === 'ADMIN';

  return (
    <div
      className="min-h-screen py-6 px-4"
      style={{
        backgroundImage: 'var(--kn-bg1-url)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div
        className="mx-auto max-w-6xl"
        style={{ filter: 'drop-shadow(0 4px 28px rgba(0,0,0,0.55))' }}
      >
        <Header member={member} />
        <MainNav isAdmin={isAdmin ?? false} locale={locale} nickname={member?.nickname ?? ''} />
        <div className="flex" style={{ background: '#ffffff', minHeight: 420 }}>
          <Sidebar member={member} locale={locale} />
          <main className="flex-1 p-7 min-w-0">
            {children}
          </main>
        </div>
        <div
          className="flex items-center justify-center h-9"
          style={{
            background: 'var(--kn-bg2)',
            borderBottomLeftRadius: 30,
            borderBottomRightRadius: 30,
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            KegelNetzwerk
          </span>
        </div>
      </div>
    </div>
  );
}
