import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export interface UploadResult {
  filename: string;
  path: string;
  url: string;
}

export async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function saveUploadedImage(
  file: File
): Promise<UploadResult> {
  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, WebP, and HEIC are allowed.');
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 10MB limit');
  }

  // Ensure upload directory exists
  await ensureUploadDir();

  // Generate unique filename
  const ext = file.type.split('/')[1];
  const filename = `${uuidv4()}.${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  // Convert file to buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // Compress and optimize image using sharp
  const optimizedBuffer = await sharp(buffer)
    .resize(1920, 1920, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();

  // Save to disk
  await writeFile(filepath, optimizedBuffer);

  // Return upload result
  const finalFilename = `${uuidv4()}.jpg`;
  const finalPath = path.join(UPLOAD_DIR, finalFilename);
  await writeFile(finalPath, optimizedBuffer);

  return {
    filename: finalFilename,
    path: finalPath,
    url: `/uploads/${finalFilename}`,
  };
}

export async function saveImageBuffer(
  buffer: Buffer,
  originalType?: string
): Promise<UploadResult> {
  await ensureUploadDir();

  const filename = `${uuidv4()}.jpg`;
  const filepath = path.join(UPLOAD_DIR, filename);

  // Compress and optimize
  const optimizedBuffer = await sharp(buffer)
    .resize(1920, 1920, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();

  await writeFile(filepath, optimizedBuffer);

  return {
    filename,
    path: filepath,
    url: `/uploads/${filename}`,
  };
}

export function validateImage(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, WebP, and HEIC are allowed.',
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'File size exceeds 10MB limit',
    };
  }

  return { valid: true };
}
