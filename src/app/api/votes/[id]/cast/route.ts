import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';

// POST /api/votes/[id]/cast — submit a vote
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const voteId = parseInt(id, 10);

  const vote = await prisma.vote.findFirst({
    where: { id: voteId, clubId: member.clubId },
    include: { options: true },
  });

  if (!vote) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (vote.closed) return NextResponse.json({ error: 'Vote is closed.' }, { status: 400 });

  // Check if already voted and switch is not allowed
  const existing = await prisma.voting.findFirst({
    where: { voteId, memberId: member.id },
  });
  if (existing && !vote.allowSwitch) {
    return NextResponse.json({ error: 'Already voted.' }, { status: 400 });
  }

  // selections: { [optionId]: 'yes' | 'maybe' | null }
  const { selections } = await req.json();

  // Validate max voices
  const selectedCount = Object.values(selections).filter((v) => v !== null).length;
  if (vote.maxVoices !== -1 && selectedCount > vote.maxVoices) {
    return NextResponse.json(
      { error: `Too many votes. Maximum: ${vote.maxVoices}` },
      { status: 400 }
    );
  }

  // Delete previous votings for this member on this vote
  await prisma.voting.deleteMany({ where: { voteId, memberId: member.id } });

  // Insert new votings
  const creates = [];
  for (const [optionIdStr, value] of Object.entries(selections)) {
    if (value === null) continue;
    const optionId = parseInt(optionIdStr, 10);
    if (!vote.options.find((o) => o.id === optionId)) continue;
    creates.push(
      prisma.voting.create({
        data: {
          voteId,
          optionId,
          memberId: member.id,
          maybe: value === 'maybe',
        },
      })
    );
  }

  await Promise.all(creates);
  return NextResponse.json({ ok: true });
}
