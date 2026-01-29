import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { saveUploadedImage } from '@/lib/storage';
import { rateGuinnessSplitFromBuffer } from '@/lib/claude';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const uploadSchema = z.object({
  caption: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Parse form data
    const formData = await req.formData();
    const image = formData.get('image') as File | null;
    const caption = formData.get('caption') as string | null;

    if (!image) {
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      );
    }

    // Validate caption if provided
    if (caption) {
      try {
        uploadSchema.parse({ caption });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { error: 'Caption too long (max 500 characters)' },
            { status: 400 }
          );
        }
      }
    }

    // Save the uploaded image
    const uploadResult = await saveUploadedImage(image);

    // Get AI rating
    const buffer = Buffer.from(await image.arrayBuffer());
    let mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg';

    if (image.type === 'image/png') mediaType = 'image/png';
    else if (image.type === 'image/webp') mediaType = 'image/webp';
    else if (image.type === 'image/gif') mediaType = 'image/gif';

    const ratingResult = await rateGuinnessSplitFromBuffer(buffer, mediaType);

    // Create split in database
    const split = await prisma.split.create({
      data: {
        userId,
        imageUrl: uploadResult.url,
        caption: caption || null,
        aiRating: ratingResult.rating,
        aiFeedback: ratingResult.feedback,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Split uploaded successfully',
        split,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Upload error:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
