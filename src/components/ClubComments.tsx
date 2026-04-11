'use client';

import PublicComments, { type PublicCommentData } from '@/components/PublicComments';

export type ClubCommentData = PublicCommentData;

interface ClubCommentsProps {
  readonly clubId: number;
  readonly initialComments: ClubCommentData[];
  readonly isLoggedIn: boolean;
}

export default function ClubComments({ clubId, initialComments, isLoggedIn }: ClubCommentsProps) {
  return (
    <PublicComments
      apiPath="/api/club-comments"
      referenceKey="clubId"
      referenceId={clubId}
      initialComments={initialComments}
      isLoggedIn={isLoggedIn}
    />
  );
}
