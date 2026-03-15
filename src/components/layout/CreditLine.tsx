'use client';

import { useState } from 'react';

export default function CreditLine() {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex items-center justify-center gap-2 mt-4 pb-2"
      style={{ opacity: hovered ? 1 : 0.55 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <a
        href="https://FoelliX.de"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5"
        style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: 12 }}
      >
        <span>KegelNetzwerk.de by</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/fx.png" alt="FoelliX.de" style={{ height: 16 }} />
        <span>est. 2015 · revamped 2026</span>
      </a>
    </div>
  );
}
