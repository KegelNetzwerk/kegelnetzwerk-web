'use client';

import PublicComments, { type PublicCommentData } from '@/components/PublicComments';

export type MemberCommentData = PublicCommentData;

interface MemberCommentsProps {
  readonly profileMemberId: number;
  readonly initialComments: MemberCommentData[];
  readonly isLoggedIn: boolean;
}

export default function MemberComments({ profileMemberId, initialComments, isLoggedIn }: MemberCommentsProps) {
  return (
    <PublicComments
      apiPath="/api/member-comments"
      referenceKey="profileMemberId"
      referenceId={profileMemberId}
      initialComments={initialComments}
      isLoggedIn={isLoggedIn}
    />
  );
}
