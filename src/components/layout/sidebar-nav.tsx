'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
} from '@/components/ui/sidebar';
import { AreaChart, Bot, Library, Settings, LayoutDashboard, Map } from 'lucide-react';
import { cn } from '@/lib/utils';

export const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/analytics', label: 'Analytics', icon: AreaChart },
  { href: '/heatmap', label: 'Heatmap', icon: Map },
  { href: '/reference', label: 'Reference', icon: Library },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2.5">
          <Bot className="w-8 h-8 text-primary neon-glow" />
          <h1 className="text-2xl font-bold font-headline text-primary-foreground group-data-[collapsible=icon]:hidden">
            Silentra
          </h1>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={{ children: item.label }}
                className="justify-start"
              >
                <Link href={item.href}>
                  <item.icon
                    className={cn(
                      'h-5 w-5',
                      pathname === item.href && 'text-primary neon-glow'
                    )}
                  />
                  <span className="text-base">{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}
