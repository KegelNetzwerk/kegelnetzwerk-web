import { getCurrentMember } from '@/lib/auth';
import Sidebar from './Sidebar';
import Header from './Header';
import MainNav from './MainNav';

const BG1_IMAGES: Record<number, string> = {
  0: '/images/fullbg.jpg',
  1: '/images/fullbg_alt.jpg',
  2: '/images/fullbg_neutral.jpg',
};

/** Returns the CSS `background` value for header/footer/hole elements (bg2). */
function getBg2Style(bg2: number, bgColor: string): string {
  if (bg2 === 0) return "url('/images/bg.png') center/cover";
  if (bg2 === 1) return "url('/images/bg_alt.png') center/cover";
  if (bg2 === 2) return "url('/images/bg_light.png') center/cover";
  // bg2 === 3: custom solid color
  return `#${bgColor}`;
}

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember();
  const locale = 'de';
  const isAdmin = member?.role === 'ADMIN';

  const bg1 = member?.club?.bg1 ?? 0;
  const bg2 = member?.club?.bg2 ?? 0;
  const bgColor = member?.club?.bgColor ?? 'FFFFFF';

  const outerBgImage = BG1_IMAGES[bg1] ?? BG1_IMAGES[0];
  const innerBg = getBg2Style(bg2, bgColor);

  return (
    <div
      className="min-h-screen py-6 px-4"
      style={{
        backgroundImage: `url('${outerBgImage}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div
        className="mx-auto max-w-6xl"
        style={{ filter: 'drop-shadow(0 4px 28px rgba(0,0,0,0.55))' }}
      >
        <Header member={member} innerBg={innerBg} />
        <MainNav isAdmin={isAdmin ?? false} locale={locale} nickname={member?.nickname ?? ''} />
        <div className="flex" style={{ background: '#ffffff', minHeight: 420 }}>
          <Sidebar member={member} locale={locale} />
          <main className="flex-1 p-7 min-w-0">
            {children}
          </main>
        </div>
        <div
          className="flex items-center justify-center h-9"
          style={{
            background: innerBg,
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
