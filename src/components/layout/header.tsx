'use client';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import { navItems } from './sidebar-nav';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ScrollArea } from '@/components/ui/scroll-area';

function WaveformAnimation() {
  return (
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
      <div className="absolute bottom-0 left-0 w-[200%] h-16 opacity-30 animate-waveform"></div>
      <div className="absolute bottom-0 left-0 w-[200%] h-20 opacity-30 animate-waveform-delay"></div>
    </div>
  );
}

function NotificationCenter() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    // Fetch recent critical readings
    const q = query(
      collection(db, "readings"),
      where("level", ">=", 80),
      orderBy("level", "desc"),
      orderBy("timestamp", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedAlerts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Re-sort in memory by timestamp since Firestore requires ordering by range filter first
      fetchedAlerts.sort((a, b) => {
        const timeA = a.timestamp?.toMillis() || 0;
        const timeB = b.timestamp?.toMillis() || 0;
        return timeB - timeA;
      });
      setAlerts(fetchedAlerts);
    });

    return () => unsubscribe();
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors z-20">
          <Bell className="h-5 w-5" />
          {alerts.length > 0 && (
            <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-background/95 backdrop-blur-xl border-white/10 shadow-2xl mr-4" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h4 className="font-semibold text-sm">Notifications</h4>
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">{alerts.length} New</span>
        </div>
        <ScrollArea className="h-[300px]">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
              <Bell className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">No recent alerts</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
                  <div className="mt-0.5 bg-destructive/20 p-1.5 rounded-full">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground">Critical Noise Detected</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.zone || 'Dashboard'} recorded <span className="text-destructive font-bold">{alert.level} dB</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">
                      {alert.timestamp ? new Date(alert.timestamp.toDate()).toLocaleString() : 'Just now'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function Header() {
  const pathname = usePathname();
  const currentPage = navItems.find((item) => item.href === pathname);

  return (
    <div className="p-4 lg:px-8 pb-0 pt-6">
      <header className="relative flex h-16 shrink-0 items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 backdrop-blur-xl shadow-lg shadow-black/20 md:px-6 overflow-hidden">
        <SidebarTrigger className="md:hidden z-10" />
        <div className="flex-1 z-10">
          <h1 className="text-xl font-bold font-headline tracking-wide">
            {currentPage?.label ?? 'Silentra'}
          </h1>
        </div>
        <div className="relative flex items-center justify-center w-40 h-full overflow-hidden opacity-80 pointer-events-none">
          <WaveformAnimation />
        </div>
        <NotificationCenter />
      </header>
    </div>
  );
}
