import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { buildKegelPng } from '@/lib/kegelImage';

// POST /api/gen/kegel/save
// Body: { color, activePins?, bg?, gameId, partId }
export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member || member.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { color, strokeColor, activePins, gameId, partId } = await req.json();

  if (!gameId || !partId) {
    return NextResponse.json({ error: 'gameId and partId required' }, { status: 400 });
  }

  const part = await prisma.part.findFirst({
    where: { id: partId, clubId: member.clubId, gameOrPenaltyId: gameId },
  });
  if (!part) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const png = await buildKegelPng({
    color: color ?? '1e6091',
    strokeColor: strokeColor ?? undefined,
    activePins: Array.isArray(activePins) ? activePins : [],
  });

  const dir = path.join(process.cwd(), 'public', 'uploads', 'parts');
  await fs.mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.png`;
  await fs.writeFile(path.join(dir, filename), png);
  const pic = `/uploads/parts/${filename}`;

  const updated = await prisma.part.update({ where: { id: partId }, data: { pic } });
  return NextResponse.json(updated);
}
