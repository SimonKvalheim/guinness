import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { commentRateLimit } from '@/lib/rate-limit';

const commentSchema = z.object({
  splitId: z.string(),
  content: z.string().min(1).max(500),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Rate limiting
    const rateLimitResult = commentRateLimit.check(req, userId);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many comments. Please try again later.' },
        { status: 429 }
      );
    }
    const body = await req.json();
    const validatedData = commentSchema.parse(body);

    // Check if split exists
    const split = await prisma.split.findUnique({
      where: { id: validatedData.splitId },
    });

    if (!split) {
      return NextResponse.json({ error: 'Split not found' }, { status: 404 });
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        userId,
        splitId: validatedData.splitId,
        content: validatedData.content,
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
      { message: 'Comment posted successfully', comment },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
