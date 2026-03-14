import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { saveUploadedFile } from '@/lib/upload';
import { sendEmail, inviteEmailHtml } from '@/lib/email';
import { Role } from '@prisma/client';

// GET /api/members — list all members of the current club
export async function GET() {
  const current = await getCurrentMember();
  if (!current) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const members = await prisma.member.findMany({
    where: { clubId: current.clubId },
    orderBy: { nickname: 'asc' },
    select: {
      id: true,
      nickname: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      birthday: true,
      role: true,
      pic: true,
      createdAt: true,
    },
  });

  return NextResponse.json(members);
}

// POST /api/members — create a new member (admin only)
export async function POST(req: NextRequest) {
  const current = await getCurrentMember();
  if (!current || current.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await req.formData();
  const nickname = (formData.get('nickname') as string)?.trim() ?? '';
  const email = (formData.get('email') as string)?.trim() ?? '';
  const firstName = (formData.get('firstName') as string)?.trim() ?? '';
  const lastName = (formData.get('lastName') as string)?.trim() ?? '';
  const birthdayStr = (formData.get('birthday') as string)?.trim() ?? '';
  const password = (formData.get('password') as string) ?? '';
  const role = (formData.get('role') as string) === 'ADMIN' ? Role.ADMIN : Role.MEMBER;
  const sendInvite = formData.get('sendInvite') === 'true';
  const avatarFile = formData.get('avatar') as File | null;

  if (nickname.length < 2) {
    return NextResponse.json({ error: 'nicknameTooShort' }, { status: 422 });
  }
  if (password.length < 4) {
    return NextResponse.json({ error: 'weakPassword' }, { status: 422 });
  }

  // Check uniqueness within club
  const existing = await prisma.member.findFirst({
    where: {
      clubId: current.clubId,
      OR: [{ nickname }, ...(email ? [{ email }] : [])],
    },
  });
  if (existing) {
    return NextResponse.json({ error: 'nicknameTaken' }, { status: 409 });
  }

  let pic = 'none';
  if (avatarFile && avatarFile.size > 0) {
    pic = await saveUploadedFile(avatarFile, 'avatars');
  }

  const birthday = birthdayStr ? new Date(birthdayStr) : null;
  const passwordHash = await hashPassword(password);

  const member = await prisma.member.create({
    data: {
      clubId: current.clubId,
      nickname,
      email,
      firstName,
      lastName,
      birthday,
      passwordHash,
      role,
      pic,
      phone: (formData.get('phone') as string)?.trim() ?? '',
    },
  });

  // Send invitation email if requested
  if (sendInvite && email) {
    const club = current.club;
    await sendEmail({
      to: email,
      subject: `Einladung zu ${club.name} auf KegelNetzwerk`,
      html: inviteEmailHtml(club.name, nickname, password),
    }).catch(() => {});
  }

  return NextResponse.json(member, { status: 201 });
}
