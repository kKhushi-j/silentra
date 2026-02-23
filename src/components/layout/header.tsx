'use client';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import { navItems } from './sidebar-nav';

function WaveformAnimation() {
  return (
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
      <div className="absolute bottom-0 left-0 w-[200%] h-16 opacity-20 animate-waveform"></div>
      <div className="absolute bottom-0 left-0 w-[200%] h-20 opacity-20 animate-waveform-delay"></div>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const currentPage = navItems.find((item) => item.href === pathname);

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="flex-1">
        <h1 className="text-lg font-semibold font-headline">
          {currentPage?.label ?? 'Silentra'}
        </h1>
      </div>
      <div className="relative flex items-center justify-center w-32 h-full overflow-hidden">
        <WaveformAnimation />
      </div>
    </header>
  );
}
