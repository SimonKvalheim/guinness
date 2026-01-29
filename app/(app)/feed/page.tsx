'use client';

import { useEffect, useState } from 'react';
import { SplitCard } from '@/components/split-card';
import { BottomNav } from '@/components/bottom-nav';

interface Split {
  id: string;
  imageUrl: string;
  caption?: string | null;
  aiRating: number;
  aiFeedback: string;
  createdAt: string;
  user: {
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  _count?: {
    comments: number;
  };
}

export default function FeedPage() {
  const [splits, setSplits] = useState<Split[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    fetchSplits();
  }, [sort]);

  const fetchSplits = async () => {
    try {
      const response = await fetch(`/api/splits?sort=${sort}&limit=20`);
      const data = await response.json();
      setSplits(data.splits);
    } catch (error) {
      console.error('Error fetching splits:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-black border-b-2 border-[#F4E8D8] z-40 px-4 py-4">
        <h1 className="text-2xl font-bold text-[#FFD700]">G-Splits</h1>

        {/* Sort options */}
        <div className="flex gap-2 mt-3">
          {['newest', 'highest-rated', 'trending'].map((option) => (
            <button
              key={option}
              onClick={() => setSort(option)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                sort === option
                  ? 'bg-[#FFD700] text-black'
                  : 'bg-transparent border border-[#F4E8D8] text-[#F4E8D8]'
              }`}
            >
              {option.charAt(0).toUpperCase() + option.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>
      </header>

      {/* Feed */}
      <main className="max-w-screen-md mx-auto p-4">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-[#F4E8D8]">Loading splits...</p>
          </div>
        ) : splits.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#F4E8D8] mb-4">No splits yet. Be the first to post!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {splits.map((split) => (
              <SplitCard key={split.id} split={split} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
