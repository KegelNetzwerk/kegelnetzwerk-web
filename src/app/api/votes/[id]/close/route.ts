import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const voteId = Number.parseInt(id, 10);
  const { closed } = await req.json(); // true = close, false = reopen

  const vote = await prisma.vote.findFirst({ where: { id: voteId, clubId: member.clubId } });
  if (!vote) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.vote.update({ where: { id: voteId }, data: { closed: !!closed } });
  return NextResponse.json({ ok: true });
}
