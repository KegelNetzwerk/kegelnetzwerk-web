'use client';

import dynamic from 'next/dynamic';
import type { ClubCommentData } from '@/components/ClubComments';

const ClubComments = dynamic(() => import('@/components/ClubComments'), { ssr: false });

export type { ClubCommentData };

export default function ClubCommentsWrapper(props: {
  clubId: number;
  initialComments: ClubCommentData[];
  isLoggedIn: boolean;
}) {
  return <ClubComments {...props} />;
}
