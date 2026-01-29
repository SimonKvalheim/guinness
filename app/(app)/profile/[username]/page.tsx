'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { BottomNav } from '@/components/bottom-nav';
import { ArrowLeft, Trophy } from 'lucide-react';

interface Split {
  id: string;
  imageUrl: string;
  aiRating: number;
  _count: {
    comments: number;
  };
}

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  splits: Split[];
  stats: {
    totalSplits: number;
    averageRating: number;
    bestSplit: {
      id: string;
      rating: number;
      imageUrl: string;
    } | null;
  };
}

export default function ProfilePage() {
  const params = useParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [params.username]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/users/${params.username}`);
      const data = await response.json();
      setProfile(data.user);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#F4E8D8]">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#F4E8D8]">User not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-black border-b-2 border-[#F4E8D8] z-40 px-4 py-4">
        <Link href="/feed" className="flex items-center gap-2 text-[#F4E8D8] hover:text-[#FFD700]">
          <ArrowLeft size={24} />
          <span className="font-semibold">Back</span>
        </Link>
      </header>

      <main className="max-w-screen-md mx-auto p-4">
        {/* Profile header */}
        <div className="mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-24 h-24 rounded-full bg-[#F4E8D8] flex items-center justify-center text-black font-bold text-3xl">
              {profile.displayName[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-[#F4E8D8]">{profile.displayName}</h1>
              <p className="text-[#F4E8D8]/70">@{profile.username}</p>
              {profile.bio && (
                <p className="text-[#F4E8D8] mt-2">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-black border-2 border-[#F4E8D8] rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-[#FFD700]">{profile.stats.totalSplits}</p>
              <p className="text-sm text-[#F4E8D8]/70">Splits</p>
            </div>
            <div className="bg-black border-2 border-[#F4E8D8] rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-[#FFD700]">
                {profile.stats.averageRating.toFixed(1)}
              </p>
              <p className="text-sm text-[#F4E8D8]/70">Avg Rating</p>
            </div>
            <div className="bg-black border-2 border-[#F4E8D8] rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-[#FFD700]">
                {profile.stats.bestSplit?.rating.toFixed(1) || '-'}
              </p>
              <p className="text-sm text-[#F4E8D8]/70">Best</p>
            </div>
          </div>
        </div>

        {/* Best split */}
        {profile.stats.bestSplit && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="text-[#FFD700]" size={20} />
              <h2 className="text-xl font-bold text-[#F4E8D8]">Best Split</h2>
            </div>
            <Link href={`/split/${profile.stats.bestSplit.id}`}>
              <div className="relative aspect-square w-full max-w-sm bg-black rounded-lg overflow-hidden border-2 border-[#FFD700]">
                <Image
                  src={profile.stats.bestSplit.imageUrl}
                  alt="Best split"
                  fill
                  className="object-cover"
                />
                <div className="absolute top-3 right-3 bg-[#FFD700] text-black px-3 py-2 rounded-full font-bold text-lg">
                  {profile.stats.bestSplit.rating.toFixed(1)}
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Splits grid */}
        <div>
          <h2 className="text-xl font-bold text-[#F4E8D8] mb-3">All Splits</h2>
          {profile.splits.length === 0 ? (
            <p className="text-[#F4E8D8]/70 text-center py-8">No splits yet</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {profile.splits.map((split) => (
                <Link key={split.id} href={`/split/${split.id}`}>
                  <div className="relative aspect-square bg-black rounded-lg overflow-hidden border-2 border-[#F4E8D8] hover:border-[#FFD700] transition-colors">
                    <Image
                      src={split.imageUrl}
                      alt="Split"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                      <div className="flex items-center justify-between text-xs text-[#F4E8D8]">
                        <span className="font-bold">{split.aiRating.toFixed(1)}</span>
                        <span>{split._count.comments} 💬</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
