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
  const newsId = Number.parseInt(id, 10);
  const { title, content, internal } = await req.json();

  const existing = await prisma.news.findFirst({
    where: { id: newsId, clubId: member.clubId },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Append editor ID if not already there
  const editorIds = existing.editorIds
    ? existing.editorIds.split(',').filter(Boolean)
    : [];
  if (!editorIds.includes(String(member.id))) {
    editorIds.push(String(member.id));
  }

  const updated = await prisma.news.update({
    where: { id: newsId },
    data: {
      title,
      content,
      internal: !!internal,
      editorIds: editorIds.join(','),
    },
    include: { author: { select: { nickname: true } } },
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
  const newsId = Number.parseInt(id, 10);

  const existing = await prisma.news.findFirst({
    where: { id: newsId, clubId: member.clubId },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.news.delete({ where: { id: newsId } });
  return NextResponse.json({ ok: true });
}
