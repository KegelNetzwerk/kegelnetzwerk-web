import { getCurrentMember } from '@/lib/auth';
import Sidebar from './Sidebar';
import Header from './Header';

interface AppShellProps {
  children: React.ReactNode;
}

export default async function AppShell({ children }: AppShellProps) {
  const member = await getCurrentMember();

  return (
    <div className="min-h-screen flex flex-col">
      <Header member={member} />
      <div className="flex flex-1">
        <Sidebar member={member} />
        <main className="flex-1 p-6 max-w-5xl">
          {children}
        </main>
      </div>
    </div>
  );
}
