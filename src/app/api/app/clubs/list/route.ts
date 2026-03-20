import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/app/clubs/list
// Public endpoint — returns all clubs for the login screen club picker
export async function GET() {
  const clubs = await prisma.club.findMany({
    select: { id: true, name: true, pic: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(clubs);
}
