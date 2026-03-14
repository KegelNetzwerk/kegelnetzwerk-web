import { NextRequest, NextResponse } from 'next/server';
import { getAppMember } from '@/lib/appAuth';
import { saveUploadedFile } from '@/lib/upload';

// POST /api/app/upload-photo
// FormData field: photo (File)
// Saves photo and returns its URL path
export async function POST(req: NextRequest) {
  const member = await getAppMember(req);
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const photo = formData.get('photo') as File | null;

  if (!photo || photo.size === 0) {
    return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
  }

  const path = await saveUploadedFile(photo, 'photos');
  return NextResponse.json({ path });
}
