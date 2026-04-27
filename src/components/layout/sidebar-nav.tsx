'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
} from '@/components/ui/sidebar';
import { AreaChart, Library, Settings, LayoutDashboard, Map } from 'lucide-react';
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
      <SidebarHeader className="pt-6 pb-4">
        <Link href="/" className="flex items-center gap-3 px-2 group">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/40 transition-all duration-500"></div>
            <Image src="/logo.png" alt="Silentra Logo" width={32} height={32} className="relative z-10 transition-transform duration-300 group-hover:scale-110 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
          </div>
          <h1 className="text-2xl font-bold font-headline text-primary-foreground tracking-tight group-data-[collapsible=icon]:hidden">
            Silentra
          </h1>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-3">
        <SidebarMenu className="gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={{ children: item.label }}
                  className={cn(
                    "justify-start h-11 px-3 rounded-xl transition-all duration-300 relative overflow-hidden group",
                    isActive ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Link href={item.href}>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_10px_hsl(var(--primary))] animate-fade-in"></div>
                    )}
                    <item.icon
                      className={cn(
                        'h-5 w-5 transition-all duration-300 group-hover:scale-110',
                        isActive ? 'text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.8)]' : 'group-hover:text-primary/70'
                      )}
                    />
                    <span className="text-base font-medium ml-1">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}
