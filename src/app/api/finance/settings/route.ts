import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, FinanceFrequency } from '@prisma/client';

// GET /api/finance/settings — return club finance settings
export async function GET() {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await prisma.clubFinanceSettings.findUnique({
    where: { clubId: member.clubId },
  });

  return NextResponse.json(settings ?? {
    feeAmount: 0,
    feeFrequency: 'NONE',
    autoPayoffEnabled: false,
    autoPayoffFrequency: 'MONTHLY',
    autoPayoffDayOfMonth: 1,
    lastPayoffAt: null,
  });
}

// PUT /api/finance/settings — update club finance settings (admin only)
export async function PUT(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as {
    feeAmount?: number;
    feeFrequency?: string;
    autoPayoffEnabled?: boolean;
    autoPayoffFrequency?: string;
    autoPayoffDayOfMonth?: number;
  };

  const validFrequencies = Object.values(FinanceFrequency);
  const feeFrequency = validFrequencies.includes(body.feeFrequency as FinanceFrequency)
    ? (body.feeFrequency as FinanceFrequency)
    : FinanceFrequency.NONE;
  const autoPayoffFrequency = validFrequencies.includes(body.autoPayoffFrequency as FinanceFrequency)
    ? (body.autoPayoffFrequency as FinanceFrequency)
    : FinanceFrequency.MONTHLY;

  const settings = await prisma.clubFinanceSettings.upsert({
    where: { clubId: member.clubId },
    create: {
      clubId: member.clubId,
      feeAmount: body.feeAmount ?? 0,
      feeFrequency,
      autoPayoffEnabled: body.autoPayoffEnabled ?? false,
      autoPayoffFrequency,
      autoPayoffDayOfMonth: Math.min(28, Math.max(1, body.autoPayoffDayOfMonth ?? 1)),
    },
    update: {
      feeAmount: body.feeAmount ?? 0,
      feeFrequency,
      autoPayoffEnabled: body.autoPayoffEnabled ?? false,
      autoPayoffFrequency,
      autoPayoffDayOfMonth: Math.min(28, Math.max(1, body.autoPayoffDayOfMonth ?? 1)),
    },
  });

  return NextResponse.json(settings);
}
