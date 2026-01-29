'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { BottomNav } from '@/components/bottom-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Trash2 } from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}

interface Split {
  id: string;
  imageUrl: string;
  caption?: string | null;
  aiRating: number;
  aiFeedback: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  comments: Comment[];
}

export default function SplitDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const [split, setSplit] = useState<Split | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSplit();
  }, [params.id]);

  const fetchSplit = async () => {
    try {
      const response = await fetch(`/api/splits/${params.id}`);
      const data = await response.json();
      setSplit(data.split);
    } catch (error) {
      console.error('Error fetching split:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          splitId: params.id,
          content: comment,
        }),
      });

      if (response.ok) {
        setComment('');
        await fetchSplit();
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchSplit();
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#F4E8D8]">Loading...</p>
      </div>
    );
  }

  if (!split) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#F4E8D8]">Split not found</p>
      </div>
    );
  }

  const currentUserId = (session?.user as any)?.id;
  const canModerate = currentUserId === split.user.id;

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-black border-b-2 border-[#F4E8D8] z-40 px-4 py-4">
        <Link href="/feed" className="flex items-center gap-2 text-[#F4E8D8] hover:text-[#FFD700]">
          <ArrowLeft size={24} />
          <span className="font-semibold">Back</span>
        </Link>
      </header>

      <main className="max-w-screen-md mx-auto">
        {/* Image */}
        <div className="relative aspect-square w-full bg-black">
          <Image
            src={split.imageUrl}
            alt={split.caption || 'Guinness split'}
            fill
            className="object-contain"
            priority
          />
          {/* Rating badge */}
          <div className="absolute top-4 right-4 bg-[#FFD700] text-black px-4 py-2 rounded-full font-bold text-2xl shadow-lg">
            {split.aiRating.toFixed(1)}
          </div>
        </div>

        {/* User info and content */}
        <div className="p-4 border-b-2 border-[#F4E8D8]">
          <div className="flex items-center gap-3 mb-4">
            <Link href={`/profile/${split.user.username}`}>
              <div className="w-12 h-12 rounded-full bg-[#F4E8D8] flex items-center justify-center text-black font-bold">
                {split.user.displayName[0].toUpperCase()}
              </div>
            </Link>
            <div>
              <Link href={`/profile/${split.user.username}`}>
                <p className="font-semibold text-[#F4E8D8] hover:text-[#FFD700]">
                  {split.user.displayName}
                </p>
              </Link>
              <p className="text-sm text-[#F4E8D8]/70">@{split.user.username}</p>
            </div>
          </div>

          {/* AI Feedback */}
          <div className="bg-[#FFD700]/10 border border-[#FFD700] rounded-lg p-4 mb-4">
            <p className="text-[#F4E8D8] italic">&ldquo;{split.aiFeedback}&rdquo;</p>
          </div>

          {/* Caption */}
          {split.caption && (
            <p className="text-[#F4E8D8]">{split.caption}</p>
          )}

          <p className="text-sm text-[#F4E8D8]/70 mt-2">
            {new Date(split.createdAt).toLocaleString()}
          </p>
        </div>

        {/* Comments */}
        <div className="p-4">
          <h2 className="text-xl font-bold text-[#F4E8D8] mb-4">
            Comments ({split.comments.length})
          </h2>

          {/* Comment form */}
          {session && (
            <form onSubmit={handleSubmitComment} className="mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-4 py-2 bg-black border-2 border-[#F4E8D8] rounded-lg text-[#F4E8D8] placeholder-[#F4E8D8]/50 focus:outline-none focus:border-[#FFD700]"
                  maxLength={500}
                />
                <Button type="submit" disabled={submitting || !comment.trim()}>
                  Post
                </Button>
              </div>
            </form>
          )}

          {/* Comments list */}
          <div className="space-y-4">
            {split.comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F4E8D8] flex items-center justify-center text-black font-bold flex-shrink-0">
                  {comment.user.displayName[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="bg-black border border-[#F4E8D8] rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link href={`/profile/${comment.user.username}`}>
                          <p className="font-semibold text-[#F4E8D8] hover:text-[#FFD700]">
                            {comment.user.displayName}
                          </p>
                        </Link>
                        <p className="text-[#F4E8D8] mt-1">{comment.content}</p>
                      </div>
                      {(currentUserId === comment.user.id || canModerate) && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-[#F4E8D8]/70 mt-2">
                      {new Date(comment.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
