import { redirect, notFound } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import VotesClient from '../VotesClient';

export default async function VoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (!member) redirect('/login');

  const vote = await prisma.vote.findUnique({
    where: { id: Number.parseInt(id, 10) },
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
  });

  if (!vote || vote.clubId !== member.clubId) notFound();

  const myVotings = vote.votings.filter((v) => v.memberId === member.id);
  const hasVoted = myVotings.length > 0;
  const totalVoters = new Set(vote.votings.map((v) => v.memberId)).size;

  const serialized = {
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

  return (
    <VotesClient
      initialItems={[serialized]}
      initialTotal={1}
      pageSize={1}
      currentMemberId={member.id}
      isAdmin={member.role === 'ADMIN'}
    />
  );
}
