'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, PlusCircle, User } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/feed', icon: Home, label: 'Home' },
    { href: '/upload', icon: PlusCircle, label: 'Post' },
    { href: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { href: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black border-t-2 border-[#F4E8D8] z-50">
      <div className="flex justify-around items-center h-16 max-w-screen-lg mx-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname?.startsWith(href + '/');

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[44px] transition-colors ${
                isActive ? 'text-[#FFD700]' : 'text-[#F4E8D8] hover:text-[#FFD700]'
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
