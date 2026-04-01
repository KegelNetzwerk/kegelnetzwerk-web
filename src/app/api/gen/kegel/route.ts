import { NextRequest, NextResponse } from 'next/server';
import { buildKegelPng } from '@/lib/kegelImage';

export const dynamic = 'force-dynamic';

// GET /api/gen/kegel?color=1e6091&active=1,5,9&bg=transparent
// Returns a PNG preview. No auth needed — purely generative.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;

  const color = p.get('color') ?? '1e6091';
  const strokeColor = p.get('stroke') ?? undefined;

  const activeParam = p.get('active') ?? '';
  const activePins = activeParam
    ? activeParam.split(',').map(Number).filter((n) => n >= 1 && n <= 9)
    : [];

  const png = await buildKegelPng({ color, strokeColor, activePins });
  return new NextResponse(png.buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
