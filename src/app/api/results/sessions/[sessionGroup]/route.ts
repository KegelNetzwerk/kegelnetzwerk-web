import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { Role } from '@prisma/client';

type Params = { params: Promise<{ sessionGroup: string }> };

function parseGopId(req: NextRequest): number | null {
  const raw = new URL(req.url).searchParams.get('gopId');
  if (!raw) return null;
  const n = parseInt(raw);
  return isNaN(n) ? null : n;
}

// GET /api/results/sessions/[sessionGroup]?gopId=<id>
export async function GET(req: NextRequest, { params }: Params) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { sessionGroup } = await params;
  const sg = parseInt(sessionGroup);
  const gopId = parseGopId(req);

  if (gopId === null) {
    return NextResponse.json({ error: 'gopId is required' }, { status: 400 });
  }

  const [results, parts] = await Promise.all([
    prisma.result.findMany({
      where: { sessionGroup: sg, gopId, clubId: member.clubId },
      include: {
        member: { select: { nickname: true } },
        part: { select: { name: true, unit: true } },
        gameOrPenalty: { select: { name: true } },
      },
      orderBy: [{ member: { nickname: 'asc' } }, { partId: 'asc' }],
    }),
    prisma.part.findMany({
      where: { gameOrPenaltyId: gopId, clubId: member.clubId },
      select: { id: true, name: true, unit: true },
      orderBy: { id: 'asc' },
    }),
  ]);

  if (results.length === 0 && parts.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Use date from existing results, or today if no results yet
  const date = results[0]?.date.toISOString() ?? new Date().toISOString();
  const gopName = results[0]?.gameOrPenalty.name ?? '';

  return NextResponse.json({
    date,
    gopId,
    gopName,
    parts: parts.map((p) => ({ id: p.id, name: p.name, unit: p.unit })),
    rows: results.map((r) => ({
      resultId: r.id,
      memberId: r.memberId,
      nickname: r.member.nickname,
      partId: r.partId,
      partName: r.part.name,
      unit: r.part.unit,
      value: r.value,
    })),
  });
}

// PUT /api/results/sessions/[sessionGroup]?gopId=<id>
// Body: {
//   date?: string,
//   results: [{ resultId: number, value: number }],   // update existing
//   create?: [{ memberId: number, partId: number, value: number }],  // new rows
//   delete?: number[],                                // resultIds to remove
// }
export async function PUT(req: NextRequest, { params }: Params) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { sessionGroup } = await params;
  const sg = parseInt(sessionGroup);
  const gopId = parseGopId(req);

  if (gopId === null) {
    return NextResponse.json({ error: 'gopId is required' }, { status: 400 });
  }

  let body: {
    date?: string;
    results: { resultId: number; value: number }[];
    create?: { memberId: number; partId: number; value: number }[];
    delete?: number[];
  };
  try {
    body = await req.json();
    if (!Array.isArray(body.results)) throw new Error();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  let newDate: Date | undefined;
  if (body.date) {
    newDate = new Date(body.date);
    if (isNaN(newDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }
  }

  // Verify update result IDs belong to this club / session / game
  if (body.results.length > 0) {
    const resultIds = body.results.map((r) => r.resultId);
    const existing = await prisma.result.findMany({
      where: { id: { in: resultIds }, clubId: member.clubId, sessionGroup: sg, gopId },
      select: { id: true },
    });
    if (existing.length !== resultIds.length) {
      return NextResponse.json({ error: 'invalidResultId' }, { status: 422 });
    }
  }

  // Verify delete result IDs belong to this club / session / game
  if (body.delete && body.delete.length > 0) {
    const existing = await prisma.result.findMany({
      where: { id: { in: body.delete }, clubId: member.clubId, sessionGroup: sg, gopId },
      select: { id: true },
    });
    if (existing.length !== body.delete.length) {
      return NextResponse.json({ error: 'invalidDeleteId' }, { status: 422 });
    }
  }

  // Verify create partIds belong to this gopId and club
  if (body.create && body.create.length > 0) {
    const partIds = [...new Set(body.create.map((c) => c.partId))];
    const validParts = await prisma.part.findMany({
      where: { id: { in: partIds }, gameOrPenaltyId: gopId, clubId: member.clubId },
      select: { id: true },
    });
    if (validParts.length !== partIds.length) {
      return NextResponse.json({ error: 'invalidPartId' }, { status: 422 });
    }

    const memberIds = [...new Set(body.create.map((c) => c.memberId))];
    const validMembers = await prisma.member.findMany({
      where: { id: { in: memberIds }, clubId: member.clubId },
      select: { id: true },
    });
    if (validMembers.length !== memberIds.length) {
      return NextResponse.json({ error: 'invalidMemberId' }, { status: 422 });
    }
  }

  const dateForCreate = newDate ?? (await prisma.result.findFirst({
    where: { sessionGroup: sg, gopId, clubId: member.clubId },
    select: { date: true },
  }))?.date ?? new Date();

  await prisma.$transaction(async (tx) => {
    // Delete removed rows
    if (body.delete && body.delete.length > 0) {
      await tx.result.deleteMany({ where: { id: { in: body.delete } } });
    }

    // Update date on all remaining rows for this game in the session
    if (newDate) {
      await tx.result.updateMany({
        where: { sessionGroup: sg, gopId, clubId: member.clubId },
        data: { date: newDate },
      });
    }

    // Update individual values
    for (const { resultId, value } of body.results) {
      await tx.result.update({ where: { id: resultId }, data: { value } });
    }

    // Create new rows
    if (body.create && body.create.length > 0) {
      await tx.result.createMany({
        data: body.create.map(({ memberId, partId, value }) => ({
          clubId: member.clubId,
          memberId,
          partId,
          gopId,
          value,
          date: dateForCreate,
          sessionGroup: sg,
        })),
      });
    }
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/results/sessions/[sessionGroup]?gopId=<id>
export async function DELETE(req: NextRequest, { params }: Params) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { sessionGroup } = await params;
  const sg = parseInt(sessionGroup);
  const gopId = parseGopId(req);

  if (gopId === null) {
    return NextResponse.json({ error: 'gopId is required' }, { status: 400 });
  }

  await prisma.result.deleteMany({
    where: { sessionGroup: sg, gopId, clubId: member.clubId },
  });

  return NextResponse.json({ ok: true });
}
