import { getCurrentMember } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
  const member = await getCurrentMember();
  if (!member) redirect('/login');

  return (
    <ProfileClient
      member={{
        id: member.id,
        nickname: member.nickname,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        birthday: member.birthday ? member.birthday.toISOString() : null,
        pic: member.pic,
      }}
    />
  );
}
