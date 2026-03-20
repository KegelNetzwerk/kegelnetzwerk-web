import AuthShell from '@/components/layout/AuthShell';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthShell maxWidth="max-w-4xl">
      <div className="px-8 py-8">
        {children}
      </div>
    </AuthShell>
  );
}
