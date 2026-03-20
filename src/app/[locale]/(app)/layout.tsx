import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth';
import AppShell from '@/components/layout/AppShell';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await getCurrentMember();

  if (!member) {
    redirect('/');
  }

  return <AppShell>{children}</AppShell>;
}
