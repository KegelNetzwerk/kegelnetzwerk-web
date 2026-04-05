import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAppMember } from '@/lib/appAuth';

interface ResultEntry {
  clientId?: string;    // app-local UUID; stored for deletion support
  memberId?: number;    // set for member results
  guestId?: number;     // set for guest results; exactly one of memberId/guestId must be present
  partId: number;
  gopId: number;
  value: number;
  date: string;         // ISO date string
  sessionGroup: number;
}

// POST /api/app/upload-results
// Body: JSON array of ResultEntry
// Bulk-inserts game results for the authenticated member's club
export async function POST(req: NextRequest) {
  const member = await getAppMember(req);
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let entries: ResultEntry[];
  try {
    entries = await req.json();
    if (!Array.isArray(entries)) throw new Error('Expected array');
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (entries.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0 });
  }

  // Each entry must have exactly one of memberId or guestId
  const malformed = entries.find((e) => !e.memberId && !e.guestId);
  if (malformed) {
    return NextResponse.json({ error: 'Each entry needs memberId or guestId' }, { status: 422 });
  }

  // Validate all referenced parts belong to the member's club
  const partIds = [...new Set(entries.map((e) => e.partId))];
  const parts = await prisma.part.findMany({
    where: { id: { in: partIds }, clubId: member.clubId },
    select: { id: true },
  });
  const validPartIds = new Set(parts.map((p) => p.id));
  const invalidEntry = entries.find((e) => !validPartIds.has(e.partId));
  if (invalidEntry) {
    return NextResponse.json({ error: 'Invalid partId' }, { status: 422 });
  }

  // Validate all referenced memberIds belong to the member's club
  const memberIds = [...new Set(entries.filter((e) => e.memberId).map((e) => e.memberId as number))];
  if (memberIds.length > 0) {
    const validMembers = await prisma.member.findMany({
      where: { id: { in: memberIds }, clubId: member.clubId },
      select: { id: true },
    });
    const validMemberIds = new Set(validMembers.map((m) => m.id));
    const invalidMemberEntries = entries.filter((e) => e.memberId && !validMemberIds.has(e.memberId));
    if (invalidMemberEntries.length > 0) {
      return NextResponse.json({
        error: 'INVALID_PARTICIPANTS',
        invalidClientIds: invalidMemberEntries.map((e) => e.clientId).filter(Boolean),
      }, { status: 422 });
    }
  }

  // Validate all referenced guestIds belong to the member's club
  const guestIds = [...new Set(entries.filter((e) => e.guestId).map((e) => e.guestId as number))];
  if (guestIds.length > 0) {
    const validGuests = await prisma.guest.findMany({
      where: { id: { in: guestIds }, clubId: member.clubId },
      select: { id: true },
    });
    const validGuestIds = new Set(validGuests.map((g) => g.id));
    const invalidGuestEntries = entries.filter((e) => e.guestId && !validGuestIds.has(e.guestId));
    if (invalidGuestEntries.length > 0) {
      return NextResponse.json({
        error: 'INVALID_PARTICIPANTS',
        invalidClientIds: invalidGuestEntries.map((e) => e.clientId).filter(Boolean),
      }, { status: 422 });
    }
  }

  await prisma.result.createMany({
    data: entries.map((e) => ({
      clientId: e.clientId ?? null,
      clubId: member.clubId,
      memberId: e.memberId ?? null,
      guestId: e.guestId ?? null,
      partId: e.partId,
      gopId: e.gopId,
      value: e.value,
      date: new Date(e.date),
      sessionGroup: e.sessionGroup ?? Math.floor(new Date(e.date).getTime() / 1000),
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({ ok: true, inserted: entries.length });
}
