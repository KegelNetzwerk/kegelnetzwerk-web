import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import VotesClient from './VotesClient';

const PAGE_SIZE = 3;

export default async function VotesPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/login');

  const [votes, total] = await Promise.all([
    prisma.vote.findMany({
      where: { clubId: member.clubId },
      include: {
        author: { select: { id: true, nickname: true } },
        options: { orderBy: { position: 'asc' } },
        votings: {
          include: { member: { select: { id: true, nickname: true } } },
        },
        comments: {
          include: { author: { select: { nickname: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { id: 'desc' },
      take: PAGE_SIZE,
    }),
    prisma.vote.count({ where: { clubId: member.clubId } }),
  ]);

  const serialized = votes.map((vote) => {
    const myVotings = vote.votings.filter((v) => v.memberId === member.id);
    const hasVoted = myVotings.length > 0;
    const totalVoters = new Set(vote.votings.map((v) => v.memberId)).size;

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
      options: vote.options.map((opt) => {
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
          myVote: myVoteForOption
            ? (myVoteForOption.maybe ? 'maybe' : 'yes') as 'yes' | 'maybe'
            : null,
          voters: vote.anonymous
            ? []
            : [
                ...yesVotes.map((v) => ({ nickname: v.member.nickname, maybe: false })),
                ...maybeVotes.map((v) => ({ nickname: v.member.nickname, maybe: true })),
              ],
        };
      }),
      comments: vote.comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        author: c.author,
        isOwn: c.authorId === member.id,
      })),
    };
  });

  return (
    <VotesClient
      initialItems={serialized}
      initialTotal={total}
      pageSize={PAGE_SIZE}
      currentMemberId={member.id}
      isAdmin={member.role === 'ADMIN'}
    />
  );
}
