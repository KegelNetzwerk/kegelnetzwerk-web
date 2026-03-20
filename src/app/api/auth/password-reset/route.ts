import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth';
import { sendEmail, passwordResetEmailHtml } from '@/lib/email';
import { verifyTurnstile } from '@/lib/turnstile';

export async function POST(req: NextRequest) {
  const { email, captchaToken } = await req.json();

  if (!captchaToken || !(await verifyTurnstile(captchaToken))) {
    return NextResponse.json({ error: 'captchaFailed' }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ ok: true }); // don't reveal if email exists
  }

  const member = await prisma.member.findFirst({ where: { email } });
  if (member) {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { memberId: member.id, token, expiresAt },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/password-reset/confirm?token=${token}`;
    await sendEmail({
      to: email,
      subject: 'KegelNetzwerk – Passwort zurücksetzen',
      html: passwordResetEmailHtml(resetUrl),
    }).catch(() => {}); // don't fail if email sending fails
  }

  return NextResponse.json({ ok: true });
}
