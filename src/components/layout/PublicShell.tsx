import { getLocale } from 'next-intl/server';
import Header from './Header';
import MainNav from './MainNav';
import CreditLine from './CreditLine';

export default async function PublicShell({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <div
      className="min-h-screen py-1 px-1 sm:py-4 sm:px-3 lg:py-6 lg:px-4"
      style={{
        backgroundImage: 'var(--kn-bg1-url)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div
        className="mx-auto"
        style={{ maxWidth: 1400, filter: 'drop-shadow(0 4px 28px rgba(0,0,0,0.55))' }}
      >
        <Header member={null} />
        <MainNav
          isGuest
          isAdmin={false}
          locale={locale}
          nickname=""
          memberPic="none"
          clubPic="none"
        />
        <div style={{ background: '#ffffff', minHeight: 420 }}>
          <main className="p-3 sm:p-5 lg:p-7">
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
          <a href="https://KegelNetzwerk.de" target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/splash.png" alt="KegelNetzwerk" style={{ height: 22 }} />
          </a>
        </div>
      </div>
      <CreditLine />
    </div>
  );
}
