import AuthShell from '@/components/layout/AuthShell';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthShell>
      <div className="flex justify-center px-8 py-10">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </AuthShell>
  );
}
