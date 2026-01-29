'use client';

import Link from 'next/link';
import Image from 'next/image';

interface SplitCardProps {
  split: {
    id: string;
    imageUrl: string;
    caption?: string | null;
    aiRating: number;
    aiFeedback: string;
    createdAt: Date | string;
    user: {
      username: string;
      displayName: string;
      avatarUrl?: string | null;
    };
    _count?: {
      comments: number;
    };
  };
}

export function SplitCard({ split }: SplitCardProps) {
  return (
    <div className="bg-black border-2 border-[#F4E8D8] rounded-lg overflow-hidden">
      {/* User info */}
      <div className="p-3 flex items-center gap-2">
        <Link href={`/profile/${split.user.username}`}>
          <div className="w-10 h-10 rounded-full bg-[#F4E8D8] flex items-center justify-center text-black font-bold">
            {split.user.avatarUrl ? (
              <Image
                src={split.user.avatarUrl}
                alt={split.user.displayName}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              split.user.displayName[0].toUpperCase()
            )}
          </div>
        </Link>
        <div>
          <Link href={`/profile/${split.user.username}`}>
            <p className="font-semibold text-[#F4E8D8] hover:text-[#FFD700]">
              {split.user.displayName}
            </p>
          </Link>
          <p className="text-xs text-[#F4E8D8]/70">@{split.user.username}</p>
        </div>
      </div>

      {/* Image */}
      <Link href={`/split/${split.id}`}>
        <div className="relative aspect-square w-full bg-black">
          <Image
            src={split.imageUrl}
            alt={split.caption || 'Guinness split'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 600px"
          />
          {/* Rating badge */}
          <div className="absolute top-3 right-3 bg-[#FFD700] text-black px-3 py-1 rounded-full font-bold text-lg shadow-lg">
            {split.aiRating.toFixed(1)}
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        {/* AI Feedback */}
        <p className="text-[#F4E8D8] text-sm mb-2 italic">
          &ldquo;{split.aiFeedback}&rdquo;
        </p>

        {/* Caption */}
        {split.caption && (
          <p className="text-[#F4E8D8] mt-2">
            <span className="font-semibold">{split.user.username}</span> {split.caption}
          </p>
        )}

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between text-sm text-[#F4E8D8]/70">
          <span>
            {split._count?.comments || 0} {split._count?.comments === 1 ? 'comment' : 'comments'}
          </span>
          <span>
            {new Date(split.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}
