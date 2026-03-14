import { NextRequest } from 'next/server';
import { prisma } from './prisma';

// Authenticate a mobile app request via Bearer token
export async function getAppMember(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { member: { include: { club: true } } },
  });

  if (!session || session.expiresAt < new Date()) return null;
  return session.member;
}
