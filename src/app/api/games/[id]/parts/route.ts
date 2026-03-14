import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { saveUploadedFile } from '@/lib/upload';
import { Unit } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const member = await getCurrentMember();
  if (!member || member.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const gameId = parseInt(id, 10);

  const existing = await prisma.gameOrPenalty.findFirst({
    where: { id: gameId, clubId: member.clubId },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const formData = await req.formData();
  const name = formData.get('name') as string;
  const unit = (formData.get('unit') as string) === 'EURO' ? Unit.EURO : Unit.POINTS;
  const once = formData.get('once') === 'true';
  const value = parseFloat(formData.get('value') as string) || 0;
  const variable = formData.get('variable') === 'true';
  const factor = parseFloat(formData.get('factor') as string) || 1.0;
  const bonus = parseFloat(formData.get('bonus') as string) || 0.0;
  const description = (formData.get('description') as string) || '';
  const picFile = formData.get('pic') as File | null;

  if (!name || name.trim().length < 1) {
    return NextResponse.json({ error: 'Name required.' }, { status: 400 });
  }

  let pic = 'none';
  if (picFile && picFile.size > 0) {
    pic = await saveUploadedFile(picFile, 'parts');
  }

  const part = await prisma.part.create({
    data: {
      clubId: member.clubId,
      gameOrPenaltyId: gameId,
      name: name.trim(),
      unit,
      once,
      value,
      variable,
      factor,
      bonus,
      description,
      pic,
    },
  });

  return NextResponse.json(part, { status: 201 });
}
