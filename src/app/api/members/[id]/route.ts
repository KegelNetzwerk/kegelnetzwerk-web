import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { saveUploadedFile } from '@/lib/upload';
import { Role } from '@prisma/client';

// PUT /api/members/[id] — update a member (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await getCurrentMember();
  if (!current || current.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const memberId = Number.parseInt(id);

  const target = await prisma.member.findFirst({
    where: { id: memberId, clubId: current.clubId },
  });
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const formData = await req.formData();
  const nickname = (formData.get('nickname') as string)?.trim() ?? '';
  const email = (formData.get('email') as string)?.trim() ?? '';
  const firstName = (formData.get('firstName') as string)?.trim() ?? '';
  const lastName = (formData.get('lastName') as string)?.trim() ?? '';
  const birthdayStr = (formData.get('birthday') as string)?.trim() ?? '';
  const password = (formData.get('password') as string) ?? '';
  const role = (formData.get('role') as string) === 'ADMIN' ? Role.ADMIN : Role.MEMBER;
  const avatarFile = formData.get('avatar') as File | null;

  if (nickname.length < 2) {
    return NextResponse.json({ error: 'nicknameTooShort' }, { status: 422 });
  }

  // Check uniqueness (exclude self)
  const existing = await prisma.member.findFirst({
    where: {
      clubId: current.clubId,
      id: { not: memberId },
      OR: [{ nickname }, ...(email ? [{ email }] : [])],
    },
  });
  if (existing) {
    return NextResponse.json({ error: 'nicknameTaken' }, { status: 409 });
  }

  let pic = target.pic;
  if (avatarFile && avatarFile.size > 0) {
    pic = await saveUploadedFile(avatarFile, 'avatars');
  }

  const birthday = birthdayStr ? new Date(birthdayStr) : null;

  const updateData: Record<string, unknown> = {
    nickname,
    email,
    firstName,
    lastName,
    birthday,
    role,
    pic,
    phone: (formData.get('phone') as string)?.trim() ?? '',
  };

  if (password.length >= 4) {
    updateData.passwordHash = await hashPassword(password);
  }

  const updated = await prisma.member.update({
    where: { id: memberId },
    data: updateData,
  });

  return NextResponse.json(updated);
}

// DELETE /api/members/[id] — delete a member (admin only, cannot delete self)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await getCurrentMember();
  if (!current || current.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const memberId = Number.parseInt(id);

  if (memberId === current.id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  }

  const target = await prisma.member.findFirst({
    where: { id: memberId, clubId: current.clubId },
  });
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.member.delete({ where: { id: memberId } });

  return NextResponse.json({ ok: true });
}
