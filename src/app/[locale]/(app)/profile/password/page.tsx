import { getCurrentMember } from '@/lib/auth';
import { getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import PasswordClient from './PasswordClient';

export default async function ChangePasswordPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/login');

  const locale = await getLocale();

  return <PasswordClient profileHref={`/${locale}/profile`} />;
}
