import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { saveUploadedFile } from '@/lib/upload';

// PUT /api/profile — self-service profile edit
export async function PUT(req: NextRequest) {
  const current = await getCurrentMember();
  if (!current) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const nickname = (formData.get('nickname') as string)?.trim() ?? '';
  const email = (formData.get('email') as string)?.trim() ?? '';
  const firstName = (formData.get('firstName') as string)?.trim() ?? '';
  const lastName = (formData.get('lastName') as string)?.trim() ?? '';
  const birthdayStr = (formData.get('birthday') as string)?.trim() ?? '';
  const phone = (formData.get('phone') as string)?.trim() ?? '';
  const password = (formData.get('password') as string) ?? '';
  const avatarFile = formData.get('avatar') as File | null;

  if (nickname.length < 2) {
    return NextResponse.json({ error: 'nicknameRequired' }, { status: 422 });
  }

  // Check uniqueness within club (exclude self)
  const existing = await prisma.member.findFirst({
    where: {
      clubId: current.clubId,
      id: { not: current.id },
      OR: [{ nickname }, ...(email ? [{ email }] : [])],
    },
  });
  if (existing) {
    if (existing.nickname === nickname) {
      return NextResponse.json({ error: 'nicknameTaken' }, { status: 409 });
    }
    return NextResponse.json({ error: 'emailTaken' }, { status: 409 });
  }

  let pic = current.pic;
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
    phone,
    pic,
  };

  if (password.length >= 4) {
    updateData.passwordHash = await hashPassword(password);
  }

  const updated = await prisma.member.update({
    where: { id: current.id },
    data: updateData,
  });

  return NextResponse.json(updated);
}
