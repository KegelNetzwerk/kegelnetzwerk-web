import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { saveUploadedFile } from '@/lib/upload';
import { Role } from '@prisma/client';

// GET /api/club/settings — get current club settings
export async function GET() {
  const current = await getCurrentMember();
  if (!current) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const club = await prisma.club.findUnique({
    where: { id: current.clubId },
  });
  if (!club) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(club);
}

// PUT /api/club/settings — update club settings (admin only)
export async function PUT(req: NextRequest) {
  const current = await getCurrentMember();
  if (!current || current.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await req.formData();

  const aboutUs = (formData.get('aboutUs') as string) ?? '';
  const farbe1 = ((formData.get('farbe1') as string) ?? '').replace('#', '');
  const farbe2 = ((formData.get('farbe2') as string) ?? '').replace('#', '');
  const farbe3 = ((formData.get('farbe3') as string) ?? '').replace('#', '');
  const mono = formData.get('mono') === 'true';
  const bg1 = parseInt((formData.get('bg1') as string) ?? '0') || 0;
  const bg2 = parseInt((formData.get('bg2') as string) ?? '0') || 0;
  const bgColor = ((formData.get('bgColor') as string) ?? '').replace('#', '') || 'FFFFFF';

  const logoFile = formData.get('logo') as File | null;
  const headerFile = formData.get('header') as File | null;
  const deleteLogo = formData.get('deleteLogo') === 'true';
  const deleteHeader = formData.get('deleteHeader') === 'true';

  const current_club = await prisma.club.findUnique({ where: { id: current.clubId } });
  if (!current_club) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let pic = current_club.pic;
  let header = current_club.header;

  if (deleteLogo) pic = 'none';
  if (deleteHeader) header = 'none';

  if (logoFile && logoFile.size > 0) {
    pic = await saveUploadedFile(logoFile, 'logos');
  }
  if (headerFile && headerFile.size > 0) {
    header = await saveUploadedFile(headerFile, 'headers');
  }

  const updated = await prisma.club.update({
    where: { id: current.clubId },
    data: {
      aboutUs,
      farbe1: farbe1 || current_club.farbe1,
      farbe2: farbe2 || current_club.farbe2,
      farbe3: farbe3 || current_club.farbe3,
      mono,
      bg1,
      bg2,
      bgColor,
      pic,
      header,
    },
  });

  return NextResponse.json(updated);
}
