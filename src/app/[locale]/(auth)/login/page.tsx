import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  const member = await getCurrentMember();
  if (member) redirect('/news');
  return <LoginForm />;
}
