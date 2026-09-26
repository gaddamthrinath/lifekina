'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, CheckSquare, Calendar, FileText, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home',     icon: LayoutDashboard },
  { href: '/entries',   label: 'Expenses', icon: Receipt },
  { href: '/tasks',     label: 'Tasks',    icon: CheckSquare },
  { href: '/calendar',  label: 'Calendar', icon: Calendar },
  { href: '/notes',     label: 'Notes',    icon: FileText },
  { href: '/settings',  label: 'Settings', icon: Settings },
];


export default function BottomNav() {
  const path = usePathname();
  const on = (href: string) => path === href || path.startsWith(href + '/');

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={`bn-item${on(href) ? ' on' : ''}`}>
          <Icon className="bn-ico" strokeWidth={on(href) ? 2.2 : 1.7} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
