'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { BottomNav } from '@/components/bottom-nav';
import { Trophy, Medal } from 'lucide-react';

interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  rank: number;
  score: number;
  splitCount?: number;
}

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<'average-rating' | 'highest-single' | 'total-splits'>('average-rating');
  const [timeframe, setTimeframe] = useState<'all-time' | 'monthly' | 'weekly'>('all-time');

  useEffect(() => {
    fetchLeaderboard();
  }, [type, timeframe]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const userId = (session?.user as any)?.id;
      const url = `/api/leaderboard?type=${type}&timeframe=${timeframe}${userId ? `&userId=${userId}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      setLeaderboard(data.leaderboard);
      setUserRank(data.userRank);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="text-[#FFD700]" size={24} />;
    if (rank === 2) return <Medal className="text-[#C0C0C0]" size={24} />;
    if (rank === 3) return <Medal className="text-[#CD7F32]" size={24} />;
    return null;
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-black border-b-2 border-[#F4E8D8] z-40 px-4 py-4">
        <h1 className="text-2xl font-bold text-[#FFD700] mb-4">Leaderboard</h1>

        {/* Type selector */}
        <div className="space-y-2 mb-3">
          <div className="flex gap-2 overflow-x-auto">
            {[
              { value: 'average-rating', label: 'Avg Rating' },
              { value: 'highest-single', label: 'Best Split' },
              { value: 'total-splits', label: 'Most Active' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setType(option.value as any)}
                className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  type === option.value
                    ? 'bg-[#FFD700] text-black'
                    : 'bg-transparent border border-[#F4E8D8] text-[#F4E8D8]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Timeframe selector */}
          <div className="flex gap-2">
            {[
              { value: 'all-time', label: 'All Time' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'weekly', label: 'Weekly' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeframe(option.value as any)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  timeframe === option.value
                    ? 'bg-[#F4E8D8] text-black'
                    : 'bg-transparent border border-[#F4E8D8] text-[#F4E8D8]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-screen-md mx-auto p-4">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-[#F4E8D8]">Loading leaderboard...</p>
          </div>
        ) : (
          <>
            {/* User's rank */}
            {userRank && (
              <div className="bg-[#FFD700]/10 border-2 border-[#FFD700] rounded-lg p-4 mb-6">
                <p className="text-[#F4E8D8] text-sm mb-2">Your Rank</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-[#FFD700]">#{userRank.rank}</span>
                    <span className="text-[#F4E8D8] font-semibold">{userRank.displayName}</span>
                  </div>
                  <span className="text-2xl font-bold text-[#FFD700]">
                    {userRank.score.toFixed(1)}
                  </span>
                </div>
              </div>
            )}

            {/* Leaderboard list */}
            <div className="space-y-2">
              {leaderboard.map((entry) => (
                <Link
                  key={entry.userId}
                  href={`/profile/${entry.username}`}
                  className="block bg-black border-2 border-[#F4E8D8] rounded-lg p-4 hover:border-[#FFD700] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 flex items-center justify-center">
                        {getRankIcon(entry.rank) || (
                          <span className="text-xl font-bold text-[#F4E8D8]">
                            #{entry.rank}
                          </span>
                        )}
                      </div>
                      <div className="w-10 h-10 rounded-full bg-[#F4E8D8] flex items-center justify-center text-black font-bold">
                        {entry.displayName[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-[#F4E8D8]">{entry.displayName}</p>
                        <p className="text-sm text-[#F4E8D8]/70">@{entry.username}</p>
                        {entry.splitCount !== undefined && (
                          <p className="text-xs text-[#F4E8D8]/50">
                            {entry.splitCount} splits
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#FFD700]">
                        {entry.score.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {leaderboard.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[#F4E8D8]">No entries yet. Be the first!</p>
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
