import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAppMember } from '@/lib/appAuth';

// GET /api/app/activity?since=<isoTimestamp>
// Returns counts of new news (including internal) and votes since the given timestamp (background poll fallback)
export async function GET(req: NextRequest) {
  const member = await getAppMember(req);
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sinceParam = req.nextUrl.searchParams.get('since');
  const since = sinceParam ? new Date(sinceParam) : new Date(0);

  const where = { clubId: member.clubId, createdAt: { gt: since } };

  const [newsItems, voteItems, newPayoffCount] = await Promise.all([
    prisma.news.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true },
    }),
    prisma.vote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true },
    }),
    prisma.payoffEvent.count({
      where: { clubId: member.clubId, createdAt: { gt: since } },
    }),
  ]);

  return NextResponse.json({
    newNewsCount: newsItems.length,
    newVotesCount: voteItems.length,
    latestNewsTitle: newsItems[0]?.title ?? null,
    latestNewsId: newsItems[0]?.id ?? null,
    latestVoteTitle: voteItems[0]?.title ?? null,
    latestVoteId: voteItems[0]?.id ?? null,
    newPayoffCount,
  });
}
