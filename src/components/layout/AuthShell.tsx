interface AuthShellProps {
  children: React.ReactNode;
  /** Tailwind max-width class, e.g. 'max-w-2xl' (default) or 'max-w-4xl' */
  maxWidth?: string;
}

export default function AuthShell({ children, maxWidth = 'max-w-2xl' }: AuthShellProps) {
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
      <div className={`mx-auto ${maxWidth}`} style={{ filter: 'drop-shadow(0 4px 28px rgba(0,0,0,0.55))' }}>
        {/* Dark header with logo */}
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

        {/* Thin blue accent bar */}
        <div style={{ height: 8, background: 'linear-gradient(to bottom, #005982, #3089ac)' }} />

        {/* White content area */}
        <div style={{ background: '#ffffff' }}>
          {children}
        </div>

        {/* Dark footer */}
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
