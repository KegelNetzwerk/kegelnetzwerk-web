import { getLocale } from 'next-intl/server';
import AuthShell from '@/components/layout/AuthShell';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <AuthShell logoHref={`/${locale}/`}>
      <div className="flex justify-center px-8 py-10">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </AuthShell>
  );
}
