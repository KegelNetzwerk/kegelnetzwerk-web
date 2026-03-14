export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen py-6 px-4"
      style={{
        backgroundImage: "url('/images/fullbg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="mx-auto max-w-2xl" style={{ filter: 'drop-shadow(0 4px 28px rgba(0,0,0,0.55))' }}>
        {/* Dark header */}
        <div
          className="flex items-center justify-center"
          style={{
            background: 'linear-gradient(to bottom, #2e2e2e, #111111)',
            height: 120,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/splash.png" alt="KegelNetzwerk" style={{ height: 82, objectFit: 'contain' }} />
        </div>
        {/* Thin accent bar */}
        <div style={{ height: 8, background: 'linear-gradient(to bottom, #005982, #3089ac)' }} />
        {/* White card */}
        <div
          className="flex justify-center px-8 py-10"
          style={{ background: '#ffffff' }}
        >
          <div className="w-full max-w-sm">
            {children}
          </div>
        </div>
        {/* Footer */}
        <div
          className="flex items-center justify-center h-9"
          style={{
            background: 'linear-gradient(to bottom, #111111, #2a2a2a)',
            borderBottomLeftRadius: 30,
            borderBottomRightRadius: 30,
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            KegelNetzwerk
          </span>
        </div>
      </div>
    </div>
  );
}
