import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { saveUploadedFile } from '@/lib/upload';
import { Unit } from '@prisma/client';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> }
) {
  const member = await getCurrentMember();
  if (!member || member.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { partId } = await params;
  const pId = parseInt(partId, 10);

  const existing = await prisma.part.findFirst({
    where: { id: pId, clubId: member.clubId },
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

  let pic = existing.pic;
  if (picFile && picFile.size > 0) {
    pic = await saveUploadedFile(picFile, 'parts');
  }

  const updated = await prisma.part.update({
    where: { id: pId },
    data: { name: name.trim(), unit, once, value, variable, factor, bonus, description, pic },
  });

  return NextResponse.json(updated);
}

// PATCH: update only the pic field
// picType=upload  + pic (File)  → save file, store path
// picType=emoji   + picValue    → store "emoji:<value>"
// picType=none                  → store "none"
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> }
) {
  const member = await getCurrentMember();
  if (!member || member.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { partId } = await params;
  const pId = parseInt(partId, 10);

  const existing = await prisma.part.findFirst({
    where: { id: pId, clubId: member.clubId },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const formData = await req.formData();
  const picType = formData.get('picType') as string;

  let pic: string;
  if (picType === 'upload') {
    const picFile = formData.get('pic') as File | null;
    if (!picFile || picFile.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    pic = await saveUploadedFile(picFile, 'parts');
  } else if (picType === 'emoji') {
    const picValue = (formData.get('picValue') as string)?.trim();
    if (!picValue) return NextResponse.json({ error: 'No emoji provided' }, { status: 400 });
    pic = `emoji:${picValue}`;
  } else {
    pic = 'none';
  }

  const updated = await prisma.part.update({ where: { id: pId }, data: { pic } });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> }
) {
  const member = await getCurrentMember();
  if (!member || member.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { partId } = await params;
  const pId = parseInt(partId, 10);

  const existing = await prisma.part.findFirst({
    where: { id: pId, clubId: member.clubId },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.part.delete({ where: { id: pId } });
  return NextResponse.json({ ok: true });
}
