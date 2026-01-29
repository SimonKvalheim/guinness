import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
        splits: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                comments: true,
              },
            },
          },
        },
        _count: {
          select: {
            splits: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate average rating
    const ratings = user.splits.map((s) => s.aiRating);
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0;

    // Find best split
    const bestSplit = user.splits.reduce((best, current) =>
      current.aiRating > (best?.aiRating || 0) ? current : best,
      user.splits[0]
    );

    return NextResponse.json({
      user: {
        ...user,
        stats: {
          totalSplits: user._count.splits,
          averageRating: avgRating,
          bestSplit: bestSplit
            ? {
                id: bestSplit.id,
                rating: bestSplit.aiRating,
                imageUrl: bestSplit.imageUrl,
              }
            : null,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
