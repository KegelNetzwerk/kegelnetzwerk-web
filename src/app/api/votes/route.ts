import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { sendPushToClub } from '@/lib/push';

const PAGE_SIZE = 3;

export async function GET(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const voteId = searchParams.get('id');

  const where = {
    clubId: member.clubId,
    ...(voteId ? { id: parseInt(voteId, 10) } : {}),
  };

  const [votes, total] = await Promise.all([
    prisma.vote.findMany({
      where,
      include: {
        author: { select: { id: true, nickname: true } },
        options: { orderBy: { position: 'asc' } },
        votings: {
          include: { member: { select: { id: true, nickname: true } } },
        },
        comments: {
          include: { author: { select: { nickname: true, pic: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { id: 'desc' },
      take: voteId ? 1 : PAGE_SIZE,
      skip: voteId ? 0 : offset,
    }),
    voteId ? Promise.resolve(1) : prisma.vote.count({ where }),
  ]);

  // Annotate with per-member voting state
  const annotated = votes.map((vote) => {
    const myVotings = vote.votings.filter((v) => v.memberId === member.id);
    const hasVoted = myVotings.length > 0;
    const totalVoters = new Set(vote.votings.map((v) => v.memberId)).size;

    const options = vote.options.map((opt) => {
      const yesVotes = vote.votings.filter((v) => v.optionId === opt.id && !v.maybe);
      const maybeVotes = vote.votings.filter((v) => v.optionId === opt.id && v.maybe);
      const myVoteForOption = myVotings.find((v) => v.optionId === opt.id);

      return {
        id: opt.id,
        text: opt.text,
        position: opt.position,
        yesCount: yesVotes.length,
        maybeCount: maybeVotes.length,
        totalVoters,
        myVote: myVoteForOption ? (myVoteForOption.maybe ? 'maybe' : 'yes') : null,
        voters: vote.anonymous
          ? []
          : [
              ...yesVotes.map((v) => ({ nickname: v.member.nickname, maybe: false })),
              ...maybeVotes.map((v) => ({ nickname: v.member.nickname, maybe: true })),
            ],
      };
    });

    return {
      id: vote.id,
      title: vote.title,
      description: vote.description,
      maxVoices: vote.maxVoices,
      anonymous: vote.anonymous,
      maybe: vote.maybe,
      previewResults: vote.previewResults,
      allowSwitch: vote.allowSwitch,
      closed: vote.closed,
      createdAt: vote.createdAt.toISOString(),
      author: vote.author,
      hasVoted,
      options,
      comments: vote.comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        author: c.author,
        isOwn: c.authorId === member.id,
      })),
    };
  });

  return NextResponse.json({ items: annotated, total, pageSize: PAGE_SIZE });
}

export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, description, options, maxVoices, anonymous, maybe, previewResults, allowSwitch } =
    await req.json();

  if (!title || title.length < 3) {
    return NextResponse.json({ error: 'Title too short.' }, { status: 400 });
  }
  if (!options || options.length < 2) {
    return NextResponse.json({ error: 'At least 2 options required.' }, { status: 400 });
  }

  const vote = await prisma.vote.create({
    data: {
      clubId: member.clubId,
      authorId: member.id,
      title,
      description: description ?? '',
      maxVoices: maxVoices === -1 ? -1 : Math.max(1, parseInt(maxVoices ?? '1', 10)),
      anonymous: !!anonymous,
      maybe: !!maybe,
      previewResults: !!previewResults,
      allowSwitch: !!allowSwitch,
      options: {
        create: options.map((text: string, i: number) => ({ text, position: i })),
      },
    },
    include: { author: { select: { id: true, nickname: true } } },
  });

  // Send push notification to app users (fire-and-forget)
  sendPushToClub(member.clubId, title, 'Neue Abstimmung im KegelNetzwerk', { type: 'vote' }).catch(() => {});

  return NextResponse.json(vote, { status: 201 });
}
