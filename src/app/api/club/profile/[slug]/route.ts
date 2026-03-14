import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/club/profile/[slug] — public club profile
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const club = await prisma.club.findUnique({
    where: { name: slug },
    select: {
      id: true,
      name: true,
      pic: true,
      header: true,
      aboutUs: true,
      farbe1: true,
      farbe2: true,
      farbe3: true,
      members: {
        select: {
          id: true,
          nickname: true,
          firstName: true,
          lastName: true,
          pic: true,
        },
        orderBy: { nickname: 'asc' },
      },
    },
  });

  if (!club) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(club);
}
