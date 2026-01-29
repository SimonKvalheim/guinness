import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort = searchParams.get('sort') || 'newest';
    const userId = searchParams.get('userId');

    let orderBy: any = { createdAt: 'desc' };

    switch (sort) {
      case 'highest-rated':
        orderBy = { aiRating: 'desc' };
        break;
      case 'trending':
        // For trending, we'll use a combination of recent + comments count
        // This is a simplified version - in production you'd want more sophisticated trending
        orderBy = [{ createdAt: 'desc' }];
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    const where = userId ? { userId } : {};

    const splits = await prisma.split.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    const total = await prisma.split.count({ where });

    return NextResponse.json({
      splits,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching splits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
