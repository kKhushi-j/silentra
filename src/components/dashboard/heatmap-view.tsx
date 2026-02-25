'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { collection, doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Upload, Wifi, WifiOff, Zap, BarChart, Rss } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

const defaultImageUrl =
  PlaceHolderImages.find((img) => img.id === 'room-layout')?.imageUrl ||
  'https://picsum.photos/seed/room-layout/800/600';

const defaultImageHint =
  PlaceHolderImages.find((img) => img.id === 'room-layout')?.imageHint ||
  'blueprint room';

const DEVICE_IDS = ['Mic_A', 'Mic_B', 'Mic_C', 'Mic_D'] as const;
type DeviceId = (typeof DEVICE_IDS)[number];

type NoiseClassification =
  | 'Silent'
  | 'Moderate'
  | 'Warning'
  | 'Critical'
  | 'Emergency'
  | 'Offline';

type DeviceState = {
  id: DeviceId;
  zone: string;
  position: { top: string; left: string };
  decibel: number;
  classification: NoiseClassification;
  lastUpdate: number;
  isOnline: boolean;
};

const getClassification = (db: number): NoiseClassification => {
  if (db <= 0) return 'Offline';
  if (db <= 40) return 'Silent';
  if (db <= 60) return 'Moderate';
  if (db <= 75) return 'Warning';
  if (db <= 90) return 'Critical';
  return 'Emergency';
};

const CLASSIFICATION_COLORS: Record<
  NoiseClassification,
  { base: string; shadow: string }
> = {
  Offline: {
    base: 'hsla(220, 10%, 50%, 0.2)',
    shadow: '0 0 0px 0px hsla(220, 10%, 50%, 0)',
  },
  Silent: {
    base: 'hsla(120, 100%, 50%, 0.2)',
    shadow: '0 0 20px 5px hsla(120, 100%, 50%, 0.3)',
  },
  Moderate: {
    base: 'hsla(60, 100%, 50%, 0.2)',
    shadow: '0 0 25px 8px hsla(60, 100%, 50%, 0.35)',
  },
  Warning: {
    base: 'hsla(39, 100%, 50%, 0.3)',
    shadow: '0 0 30px 10px hsla(39, 100%, 50%, 0.4)',
  },
  Critical: {
    base: 'hsla(0, 100%, 50%, 0.35)',
    shadow: '0 0 35px 12px hsla(0, 100%, 50%, 0.45)',
  },
  Emergency: {
    base: 'hsla(0, 100%, 50%, 0.4)',
    shadow: '0 0 40px 15px hsla(0, 100%, 50%, 0.5)',
  },
};

const initialDevices: Record<DeviceId, DeviceState> = {
  Mic_A: {
    id: 'Mic_A',
    zone: 'Front Left',
    position: { top: '25%', left: '25%' },
    decibel: 0,
    classification: 'Offline',
    lastUpdate: 0,
    isOnline: false,
  },
  Mic_B: {
    id: 'Mic_B',
    zone: 'Front Right',
    position: { top: '25%', left: '75%' },
    decibel: 0,
    classification: 'Offline',
    lastUpdate: 0,
    isOnline: false,
  },
  Mic_C: {
    id: 'Mic_C',
    zone: 'Back Left',
    position: { top: '75%', left: '25%' },
    decibel: 0,
    classification: 'Offline',
    lastUpdate: 0,
    isOnline: false,
  },
  Mic_D: {
    id: 'Mic_D',
    zone: 'Back Right',
    position: { top: '75%', left: '75%' },
    decibel: 0,
    classification: 'Offline',
    lastUpdate: 0,
    isOnline: false,
  },
};

const OFFLINE_THRESHOLD = 10000; // 10 seconds

export function HeatmapView() {
  const [imageUrl, setImageUrl] = useState<string>(defaultImageUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const db = useFirestore();
  const [devices, setDevices] =
    useState<Record<DeviceId, DeviceState>>(initialDevices);
  const [isLoading, setIsLoading] = useState(true);

  // Store history for smoothing
  const historyRef = useRef<Record<DeviceId, number[]>>({Mic_A: [], Mic_B: [], Mic_C: [], Mic_D: []});

  useEffect(() => {
    if (!db) return;
    setIsLoading(true);

    const unsubscribers = DEVICE_IDS.map((deviceId) => {
      const docRef = doc(db, 'devices', deviceId);
      return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as {
            decibel: number;
            timestamp: Timestamp;
            status: 'online' | 'offline';
          };
          
          if (data.status === 'offline') {
            setDevices(prev => ({
              ...prev,
              [deviceId]: { ...prev[deviceId], isOnline: false, decibel: 0, classification: 'Offline' }
            }));
            return;
          }

          const history = historyRef.current[deviceId];
          history.push(data.decibel);
          if (history.length > 5) history.shift();

          const smoothedDecibel = history.reduce((a, b) => a + b, 0) / history.length;

          setDevices((prevDevices) => ({
            ...prevDevices,
            [deviceId]: {
              ...prevDevices[deviceId],
              decibel: smoothedDecibel,
              classification: getClassification(smoothedDecibel),
              lastUpdate: data.timestamp.toMillis(),
              isOnline: true,
            },
          }));
        }
        if(isLoading) setIsLoading(false);
      }, (error) => {
        console.error(`Error listening to device ${deviceId}:`, error);
        setIsLoading(false);
      });
    });

    const interval = setInterval(() => {
      const now = Date.now();
      setDevices((prevDevices) => {
        let changed = false;
        const newDevices = { ...prevDevices };
        for (const deviceId of DEVICE_IDS) {
          const device = newDevices[deviceId as DeviceId];
          if (device.isOnline && now - device.lastUpdate > OFFLINE_THRESHOLD) {
            newDevices[deviceId as DeviceId] = { ...device, isOnline: false, decibel: 0, classification: 'Offline' };
            changed = true;
          }
        }
        return changed ? newDevices : prevDevices;
      });
    }, 2000);

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      clearInterval(interval);
    };
  }, [db, isLoading]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) setImageUrl(e.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const deviceArray = useMemo(() => Object.values(devices), [devices]);
  
  const onlineDevices = useMemo(() => deviceArray.filter(d => d.isOnline), [deviceArray]);

  const { highestDevice, averageNoise } = useMemo(() => {
    if (onlineDevices.length === 0) return { highestDevice: null, averageNoise: 0 };
    const highest = onlineDevices.reduce((max, device) => device.decibel > max.decibel ? device : max);
    const avg = onlineDevices.reduce((sum, d) => sum + d.decibel, 0) / onlineDevices.length;
    return { highestDevice: highest, averageNoise: avg };
  }, [onlineDevices]);
  
  const allOnline = useMemo(() => onlineDevices.length === DEVICE_IDS.length, [onlineDevices]);

  if (isLoading) {
    return (
       <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
            <CardContent><Skeleton className="aspect-[4/3] w-full" /></CardContent>
          </Card>
        </div>
         <div>
           <Card>
             <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
             <CardContent className="space-y-4">
               <Skeleton className="h-10 w-full" />
               <Skeleton className="h-24 w-full" />
             </CardContent>
           </Card>
         </div>
       </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Real-time Noise Heatmap</CardTitle>
            <CardDescription>
              Live intensity from microphone sensors in the environment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Global Summary Panel */}
            <Card className="mb-4 bg-muted/30">
                <CardHeader className='p-4'>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-base">Room Status</CardTitle>
                        <Badge variant={allOnline ? 'default' : 'destructive'} className="flex items-center gap-2">
                            {allOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                            {allOnline ? 'All Devices Online' : 'Device Offline'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div className='flex items-center gap-3'>
                        <Zap className="text-primary neon-glow-accent" />
                        <div>
                            <p className="font-medium">Peak Intensity</p>
                            <p className="text-muted-foreground font-bold">{Math.round(highestDevice?.decibel || 0)} dB ({highestDevice?.zone || 'N/A'})</p>
                        </div>
                    </div>
                     <div className='flex items-center gap-3'>
                        <BarChart className="text-primary" />
                        <div>
                            <p className="font-medium">Average Noise</p>
                            <p className="text-muted-foreground font-bold">{Math.round(averageNoise)} dB</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="relative aspect-[4/3] w-full rounded-md overflow-hidden bg-muted">
              <Image src={imageUrl} alt="Room Layout" fill className="object-contain" data-ai-hint={defaultImageHint}/>
              {deviceArray.map((device) => {
                const isHighest = highestDevice && device.id === highestDevice.id && device.isOnline;
                const colorConfig = CLASSIFICATION_COLORS[device.classification];
                const size = 60 + device.decibel;

                return (
                  <div
                    key={device.id}
                    className="absolute rounded-full transition-all duration-300 ease-out flex items-center justify-center"
                    style={{
                      top: device.position.top,
                      left: device.position.left,
                      width: `${size}px`,
                      height: `${size}px`,
                      transform: `translate(-50%, -50%) scale(${isHighest ? 1.15 : 1})`,
                      backgroundColor: colorConfig.base,
                      boxShadow: colorConfig.shadow,
                      animation: (device.classification === 'Emergency' || device.classification === 'Critical') && device.isOnline ? 'pulse 1.5s infinite' : 'none',
                    }}
                  >
                    <div className="text-center text-white font-bold">
                      <div className="text-lg drop-shadow-md">
                        {Math.round(device.decibel)}
                        <span className="text-xs">dB</span>
                      </div>
                      <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0 h-auto bg-black/30 backdrop-blur-sm">
                          {device.classification}
                      </Badge>
                      {isHighest && (
                        <Badge variant="destructive" className="mt-1 text-[10px] px-1.5 py-0 h-auto animate-pulse">
                          Highest
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Upload a room layout image to customize the heatmap.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input type="file" accept="image/*" onChange={handleImageUpload} ref={fileInputRef} className="hidden" />
            <Button onClick={() => fileInputRef.current?.click()} className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              Upload Layout
            </Button>
            <p className="text-xs text-muted-foreground pt-4">
              This heatmap visualizes real-time data from your Firestore
              &apos;devices&apos; collection. Use the &apos;Sensor&apos; page to emulate a device.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
