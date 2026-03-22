import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAppMember } from '@/lib/appAuth';

// POST /api/app/delete-results
// Body: { clientIds: string[] }
// Deletes results by clientId, scoped to the authenticated member's club.
export async function POST(req: NextRequest) {
  const member = await getAppMember(req);
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let clientIds: string[];
  try {
    const body = await req.json();
    if (!Array.isArray(body.clientIds)) throw new Error('Expected clientIds array');
    clientIds = body.clientIds;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (clientIds.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0 });
  }

  const { count } = await prisma.result.deleteMany({
    where: {
      clientId: { in: clientIds },
      clubId: member.clubId,
    },
  });

  return NextResponse.json({ ok: true, deleted: count });
}
