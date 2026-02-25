'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Upload, Wifi, WifiOff } from 'lucide-react';

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
  history: number[];
  classification: NoiseClassification;
  lastUpdate: number;
  isOnline: boolean;
};

const getClassification = (db: number): NoiseClassification => {
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
    zone: 'Top Left',
    position: { top: '25%', left: '25%' },
    decibel: 0,
    history: [],
    classification: 'Offline',
    lastUpdate: 0,
    isOnline: false,
  },
  Mic_B: {
    id: 'Mic_B',
    zone: 'Top Right',
    position: { top: '25%', left: '75%' },
    decibel: 0,
    history: [],
    classification: 'Offline',
    lastUpdate: 0,
    isOnline: false,
  },
  Mic_C: {
    id: 'Mic_C',
    zone: 'Bottom Left',
    position: { top: '75%', left: '25%' },
    decibel: 0,
    history: [],
    classification: 'Offline',
    lastUpdate: 0,
    isOnline: false,
  },
  Mic_D: {
    id: 'Mic_D',
    zone: 'Bottom Right',
    position: { top: '75%', left: '75%' },
    decibel: 0,
    history: [],
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

  useEffect(() => {
    if (!db) return;

    const unsubscribers = DEVICE_IDS.map((deviceId) => {
      const docRef = doc(collection(db, 'devices'), deviceId);
      return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as {
            decibel: number;
            timestamp: Timestamp;
            zone: string;
          };

          setDevices((prevDevices) => {
            const newHistory = [
              ...(prevDevices[deviceId].history || []),
              data.decibel,
            ].slice(-5);
            const smoothedDecibel =
              newHistory.reduce((a, b) => a + b, 0) / newHistory.length;

            return {
              ...prevDevices,
              [deviceId]: {
                ...prevDevices[deviceId],
                decibel: smoothedDecibel,
                history: newHistory,
                classification: getClassification(smoothedDecibel),
                lastUpdate: data.timestamp.toMillis(),
                isOnline: true,
              },
            };
          });
        }
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
            newDevices[deviceId as DeviceId] = {
              ...device,
              isOnline: false,
              classification: 'Offline',
            };
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
  }, [db]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImageUrl(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const deviceArray = Object.values(devices);
  const highestDevice = deviceArray.reduce(
    (max, device) => (device.decibel > max.decibel ? device : max),
    deviceArray[0]
  );
  const allOnline = deviceArray.every((d) => d.isOnline);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Real-time Noise Heatmap</CardTitle>
                <CardDescription>
                  Live intensity from 4 microphone sensors.
                </CardDescription>
              </div>
              <Badge
                variant={allOnline ? 'default' : 'destructive'}
                className="flex items-center gap-2"
              >
                {allOnline ? (
                  <Wifi className="h-4 w-4" />
                ) : (
                  <WifiOff className="h-4 w-4" />
                )}
                {allOnline ? 'All Devices Online' : 'Device Offline'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-[4/3] w-full rounded-md overflow-hidden bg-muted">
              <Image
                src={imageUrl}
                alt="Room Layout"
                fill
                className="object-contain"
                data-ai-hint={defaultImageHint}
              />
              {deviceArray.map((device) => {
                const isHighest =
                  device.id === highestDevice.id && highestDevice.decibel > 0;
                const colorConfig = CLASSIFICATION_COLORS[device.classification];
                const size = 60 + device.decibel;

                return (
                  <div
                    key={device.id}
                    className="absolute rounded-full transition-all duration-1000 ease-in-out flex items-center justify-center"
                    style={{
                      top: device.position.top,
                      left: device.position.left,
                      width: `${size}px`,
                      height: `${size}px`,
                      transform: `translate(-50%, -50%) scale(${
                        isHighest ? 1.1 : 1
                      })`,
                      backgroundColor: colorConfig.base,
                      boxShadow: colorConfig.shadow,
                      animation:
                        device.classification === 'Emergency' || isHighest
                          ? 'pulse 1.5s infinite'
                          : 'none',
                    }}
                  >
                    <div className="text-center text-white font-bold">
                      <div className="text-lg drop-shadow-md">
                        {Math.round(device.decibel)}
                        <span className="text-xs">dB</span>
                      </div>
                      {isHighest && (
                        <Badge
                          variant="secondary"
                          className="mt-1 text-xs px-1 py-0 h-auto animate-pulse"
                        >
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
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              ref={fileInputRef}
              className="hidden"
            />
            <Button onClick={handleButtonClick} className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              Upload Layout
            </Button>
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-base">
                  Overall Highest Reading
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-3xl font-bold text-primary neon-glow">
                  {Math.round(highestDevice?.decibel || 0)} dB
                </div>
                <p className="text-xs text-muted-foreground">
                  from {highestDevice?.zone || 'N/A'}
                </p>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">
              This heatmap visualizes real-time data from your Firestore
              &apos;devices&apos; collection.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
