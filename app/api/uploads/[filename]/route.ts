import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { stat } from 'fs/promises';

/**
 * API route to serve uploaded files from the Railway volume.
 *
 * On Railway, uploaded files are stored outside the public/ directory
 * (in the mounted volume at /app/uploads), so they need to be served
 * via an API route instead of being automatically served as static files.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Get upload directory from environment or use default
    const uploadDir = process.env.UPLOAD_DIR || './public/uploads';
    const filePath = path.join(uploadDir, filename);

    // Check if file exists and is a file (not a directory)
    try {
      const fileStats = await stat(filePath);
      if (!fileStats.isFile()) {
        return NextResponse.json(
          { error: 'Not a file' },
          { status: 404 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Read the file
    const fileBuffer = await readFile(filePath);

    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';
