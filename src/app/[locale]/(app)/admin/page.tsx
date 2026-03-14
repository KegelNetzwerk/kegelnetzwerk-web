import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth';

export default async function AdminPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/login');
  if (member.role !== 'ADMIN') redirect('/news');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Administration</h1>
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <Link href="/admin/games" className="border rounded p-4 text-center hover:bg-gray-50">
          🎳 Games &amp; Penalties
        </Link>
        <Link href="/admin/members" className="border rounded p-4 text-center hover:bg-gray-50">
          👥 Members
        </Link>
        <Link href="/admin/settings" className="border rounded p-4 text-center hover:bg-gray-50">
          ⚙️ Club Settings
        </Link>
      </div>
    </div>
  );
}
