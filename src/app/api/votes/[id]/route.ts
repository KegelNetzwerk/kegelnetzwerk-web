import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const voteId = Number.parseInt(id, 10);

  const existing = await prisma.vote.findFirst({ where: { id: voteId, clubId: member.clubId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { title, description, options, maxVoices, anonymous, maybe, previewResults, allowSwitch } =
    await req.json();

  // Replace options: delete all, recreate
  await prisma.voteOption.deleteMany({ where: { voteId } });

  const updated = await prisma.vote.update({
    where: { id: voteId },
    data: {
      title,
      description: description ?? '',
      maxVoices: maxVoices === -1 ? -1 : Math.max(1, Number.parseInt(maxVoices ?? '1', 10)),
      anonymous: !!anonymous,
      maybe: !!maybe,
      previewResults: !!previewResults,
      allowSwitch: !!allowSwitch,
      options: {
        create: options.map((text: string, i: number) => ({ text, position: i })),
      },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const voteId = Number.parseInt(id, 10);

  const existing = await prisma.vote.findFirst({ where: { id: voteId, clubId: member.clubId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.vote.delete({ where: { id: voteId } });
  return NextResponse.json({ ok: true });
}
