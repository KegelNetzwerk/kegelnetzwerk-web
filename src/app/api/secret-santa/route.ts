import { NextRequest, NextResponse } from 'next/server';
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

  const members = await prisma.member.findMany({
    where: { clubId: current.clubId },
    select: {
      id: true,
      secretSantaPartnerId: true,
    },
  });

  if (members.length < 2) {
    return NextResponse.json({ error: 'notEnoughMembers' }, { status: 422 });
  }

  // Build previous-year assignment map: giver -> previous partner
  const previousAssignments = new Map<number, number>();
  for (const m of members) {
    if (m.secretSantaPartnerId != null) {
      previousAssignments.set(m.id, m.secretSantaPartnerId);
    }
  }

  // Generate a valid derangement avoiding previous assignments
  const assignment = generateAssignment(
    members.map((m) => m.id),
    previousAssignments
  );

  if (!assignment) {
    return NextResponse.json({ error: 'assignmentFailed' }, { status: 422 });
  }

  // Write assignments in a transaction
  await prisma.$transaction(
    assignment.map(({ giverId, receiverId }) =>
      prisma.member.update({
        where: { id: giverId },
        data: { secretSantaPartnerId: receiverId },
      })
    )
  );

  return NextResponse.json({ ok: true, count: assignment.length });
}

// Generate a derangement: each member gives to exactly one other member,
// no member gives to themselves, and previous year's partner is avoided when possible.
function generateAssignment(
  ids: number[],
  previous: Map<number, number>
): { giverId: number; receiverId: number }[] | null {
  const n = ids.length;
  // Try up to 1000 random permutations
  for (let attempt = 0; attempt < 1000; attempt++) {
    const shuffled = [...ids].sort(() => Math.random() - 0.5);
    let valid = true;
    for (let i = 0; i < n; i++) {
      const giver = ids[i];
      const receiver = shuffled[i];
      if (giver === receiver) { valid = false; break; }
      if (previous.get(giver) === receiver) { valid = false; break; }
    }
    if (valid) {
      return ids.map((id, i) => ({ giverId: id, receiverId: shuffled[i] }));
    }
  }

  // Fallback: relax the "avoid previous" constraint (just ensure no self-assignment)
  for (let attempt = 0; attempt < 1000; attempt++) {
    const shuffled = [...ids].sort(() => Math.random() - 0.5);
    let valid = true;
    for (let i = 0; i < n; i++) {
      if (ids[i] === shuffled[i]) { valid = false; break; }
    }
    if (valid) {
      return ids.map((id, i) => ({ giverId: id, receiverId: shuffled[i] }));
    }
  }

  return null;
}
