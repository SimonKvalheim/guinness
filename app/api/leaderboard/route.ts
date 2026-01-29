import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type LeaderboardType = 'highest-single' | 'average-rating' | 'total-splits';
type TimeFrame = 'weekly' | 'monthly' | 'all-time';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get('type') || 'average-rating') as LeaderboardType;
    const timeframe = (searchParams.get('timeframe') || 'all-time') as TimeFrame;
    const limit = parseInt(searchParams.get('limit') || '100');
    const userId = searchParams.get('userId');

    // Calculate date filter for timeframe
    let dateFilter: Date | undefined;
    const now = new Date();

    if (timeframe === 'weekly') {
      dateFilter = new Date(now);
      dateFilter.setDate(now.getDate() - 7);
    } else if (timeframe === 'monthly') {
      dateFilter = new Date(now);
      dateFilter.setMonth(now.getMonth() - 1);
    }

    const whereClause = dateFilter ? { createdAt: { gte: dateFilter } } : {};

    let leaderboard: any[] = [];

    switch (type) {
      case 'highest-single': {
        // Get users with their highest rated split
        const topSplits = await prisma.split.findMany({
          where: whereClause,
          orderBy: { aiRating: 'desc' },
          take: limit,
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

        // Remove duplicates, keeping only the highest rated split per user
        const userMap = new Map();
        for (const split of topSplits) {
          if (!userMap.has(split.userId)) {
            userMap.set(split.userId, {
              userId: split.userId,
              username: split.user.username,
              displayName: split.user.displayName,
              avatarUrl: split.user.avatarUrl,
              score: split.aiRating,
              splitId: split.id,
            });
          }
        }

        leaderboard = Array.from(userMap.values());
        break;
      }

      case 'average-rating': {
        // Get users with average rating (minimum 3 splits)
        const users = await prisma.user.findMany({
          include: {
            splits: {
              where: whereClause,
              select: {
                aiRating: true,
              },
            },
          },
        });

        leaderboard = users
          .map((user) => {
            const ratings = user.splits.map((s) => s.aiRating);
            const avgRating = ratings.length >= 3
              ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
              : 0;

            return {
              userId: user.id,
              username: user.username,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
              score: avgRating,
              splitCount: ratings.length,
            };
          })
          .filter((entry) => entry.splitCount >= 3)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
        break;
      }

      case 'total-splits': {
        // Get users with most splits
        const users = await prisma.user.findMany({
          include: {
            _count: {
              select: {
                splits: true,
              },
            },
          },
          orderBy: {
            splits: {
              _count: 'desc',
            },
          },
          take: limit,
        });

        leaderboard = users.map((user) => ({
          userId: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          score: user._count.splits,
          splitCount: user._count.splits,
        }));
        break;
      }
    }

    // Add rank
    leaderboard = leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    // Find current user's rank if userId is provided
    let userRank = null;
    if (userId) {
      const userIndex = leaderboard.findIndex((entry) => entry.userId === userId);
      if (userIndex !== -1) {
        userRank = leaderboard[userIndex];
      }
    }

    return NextResponse.json({
      leaderboard,
      userRank,
      type,
      timeframe,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
