import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth';
import LoginForm from './LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ club?: string }>;
}) {
  const member = await getCurrentMember();
  if (member) redirect('/news');
  const { club } = await searchParams;
  return <LoginForm initialClubName={club ?? ''} />;
}
