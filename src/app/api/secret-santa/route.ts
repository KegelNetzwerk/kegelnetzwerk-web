import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

// GET /api/secret-santa — get current member's Secret Santa partner
export async function GET() {
  const current = await getCurrentMember();
  if (!current) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const member = await prisma.member.findUnique({
    where: { id: current.id },
    include: {
      secretSantaPartner: {
        select: { id: true, nickname: true, pic: true },
      },
    },
  });

  return NextResponse.json({ partner: member?.secretSantaPartner ?? null });
}

// POST /api/secret-santa — draw new assignments (admin only)
export async function POST(_req: NextRequest) {
  const current = await getCurrentMember();
  if (!current || current.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const currentYear = new Date().getFullYear();
  const lookbackYears = [currentYear - 1, currentYear - 2, currentYear - 3];

  const [members, recentHistory] = await Promise.all([
    prisma.member.findMany({
      where: { clubId: current.clubId },
      select: { id: true },
    }),
    prisma.secretSantaAssignment.findMany({
      where: {
        clubId: current.clubId,
        year: { in: lookbackYears },
      },
      select: { giverId: true, receiverId: true, year: true },
    }),
  ]);

  if (members.length < 2) {
    return NextResponse.json({ error: 'notEnoughMembers' }, { status: 422 });
  }

  // Build set of forbidden (giver, receiver) pairs from last 3 years
  const forbidden = new Set<string>(
    recentHistory.map((h) => `${h.giverId}:${h.receiverId}`)
  );

  const assignment = generateAssignment(
    members.map((m) => m.id),
    forbidden
  );

  if (!assignment) {
    return NextResponse.json({ error: 'assignmentFailed' }, { status: 422 });
  }

  // Persist: save history for current year + update current assignments
  await prisma.$transaction([
    // Upsert history records for this year
    ...assignment.map(({ giverId, receiverId }) =>
      prisma.secretSantaAssignment.upsert({
        where: { clubId_giverId_year: { clubId: current.clubId, giverId, year: currentYear } },
        create: { clubId: current.clubId, giverId, receiverId, year: currentYear },
        update: { receiverId },
      })
    ),
    // Update current partner pointer on each member
    ...assignment.map(({ giverId, receiverId }) =>
      prisma.member.update({
        where: { id: giverId },
        data: { secretSantaPartnerId: receiverId },
      })
    ),
  ]);

  return NextResponse.json({ ok: true, count: assignment.length });
}

// Cryptographically secure Fisher-Yates shuffle.
function cryptoShuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Generate a derangement avoiding forbidden (giver→receiver) pairs.
// Falls back relaxing constraints if needed.
function generateAssignment(
  ids: number[],
  forbidden: Set<string>
): { giverId: number; receiverId: number }[] | null {
  const n = ids.length;

  for (let attempt = 0; attempt < 2000; attempt++) {
    const shuffled = cryptoShuffle(ids);
    let valid = true;
    for (let i = 0; i < n; i++) {
      const giver = ids[i];
      const receiver = shuffled[i];
      if (giver === receiver || forbidden.has(`${giver}:${receiver}`)) {
        valid = false;
        break;
      }
    }
    if (valid) return ids.map((id, i) => ({ giverId: id, receiverId: shuffled[i] }));
  }

  // Fallback: only avoid self-assignment
  for (let attempt = 0; attempt < 1000; attempt++) {
    const shuffled = cryptoShuffle(ids);
    let valid = true;
    for (let i = 0; i < n; i++) {
      if (ids[i] === shuffled[i]) { valid = false; break; }
    }
    if (valid) return ids.map((id, i) => ({ giverId: id, receiverId: shuffled[i] }));
  }

  return null;
}
