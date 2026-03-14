export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="kn-bg">
      <div className="kn-page">
        {/* Dark header with logo */}
        <header className="kn-header">
          <img src="/images/splash.png" alt="KegelNetzwerk" className="kn-header-logo" />
        </header>
        {/* Thin accent bar */}
        <div className="kn-navbar kn-navbar-auth" />
        {/* White card content */}
        <div className="kn-body kn-auth-body">
          <div className="kn-auth-card">
            {children}
          </div>
        </div>
        <footer className="kn-footer">
          <span className="kn-footer-text">KegelNetzwerk</span>
        </footer>
      </div>
    </div>
  );
}
