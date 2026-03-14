import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// Ensure upload directory exists
async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

// Save a file from a FormData File object to the public/uploads directory
export async function saveUploadedFile(
  file: File,
  subDir: string = ''
): Promise<string> {
  const dir = subDir ? path.join(UPLOAD_DIR, subDir) : UPLOAD_DIR;
  await ensureDir(dir);

  const ext = path.extname(file.name) || '.jpg';
  const filename = `${randomUUID()}${ext}`;
  const filepath = path.join(dir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buffer);

  return `/uploads/${subDir ? subDir + '/' : ''}${filename}`;
}
