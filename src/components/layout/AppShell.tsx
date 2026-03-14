import { getCurrentMember } from '@/lib/auth';
import Sidebar from './Sidebar';
import Header from './Header';
import MainNav from './MainNav';

interface AppShellProps {
  children: React.ReactNode;
}

export default async function AppShell({ children }: AppShellProps) {
  const member = await getCurrentMember();
  const locale = 'de'; // resolved from routing; simplified here
  const isAdmin = member?.role === 'ADMIN';

  return (
    <div className="kn-bg">
      <div className="kn-page">
        <Header member={member} />
        <MainNav isAdmin={isAdmin ?? false} locale={locale} nickname={member?.nickname ?? ''} />
        <div className="kn-body">
          <Sidebar member={member} locale={locale} />
          <main className="kn-main">
            {children}
          </main>
        </div>
        <footer className="kn-footer">
          <span className="kn-footer-text">KegelNetzwerk</span>
        </footer>
      </div>
    </div>
  );
}
