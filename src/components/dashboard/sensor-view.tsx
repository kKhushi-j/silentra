'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MicOff, Radio, Square, Wifi } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

const DEVICE_IDS = [
  { id: 'Mic_A', label: 'Front Left' },
  { id: 'Mic_B', label: 'Front Right' },
  { id: 'Mic_C', label: 'Back Left' },
  { id: 'Mic_D', label: 'Back Right' },
];

type DeviceId = 'Mic_A' | 'Mic_B' | 'Mic_C' | 'Mic_D';

export function SensorView() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [decibels, setDecibels] = useState(0);
  const [selectedZone, setSelectedZone] = useState<DeviceId>('Mic_A');
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  const db = useFirestore();
  const { toast } = useToast();

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  
  const startMonitoring = async () => {
    console.log("Start clicked");
  
    const deviceRef = doc(db, "devices", selectedZone);
  
    try {
      await setDoc(deviceRef, {
        level: 50,
        status: "online",
        lastUpdated: new Date().toISOString()
      });
  
      console.log("Manual write success");
    } catch (error) {
      console.error("Manual write error:", error);
    }
  };

  const stopMonitoring = async () => {
    console.log("Stop clicked");
    setIsMonitoring(false);
  };
  
  useEffect(() => {
    return () => {
        if (isMonitoring) {
           stopMonitoring();
        }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMonitoring]);

  const getCurrentDecibelLevel = (): number => {
    if (!analyserRef.current || !dataArrayRef.current) {
        return 0;
    }
    analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
    let sumSquares = 0.0;
    for (const amplitude of dataArrayRef.current) {
      const normalizedAmplitude = amplitude / 128.0 - 1.0;
      sumSquares += normalizedAmplitude * normalizedAmplitude;
    }
    const rms = Math.sqrt(sumSquares / dataArrayRef.current.length);
    const effectiveRms = Math.max(rms, 0.00001);
    let dbValue = 20 * Math.log10(effectiveRms) + 94; // 94dB is a common reference for consumer microphones
    return Math.max(20, Math.min(120, dbValue));
  }

  return (
    <div className="flex justify-center items-center p-4 h-full">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sensor Emulator</CardTitle>
          <CardDescription>
            Use your device's microphone to simulate a remote noise sensor and
            send data to Firestore.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {hasMicPermission === false && (
            <Alert variant="destructive">
              <MicOff className="h-4 w-4" />
              <AlertTitle>Microphone Access Required</AlertTitle>
              <AlertDescription>
                Please grant microphone permission to use this feature.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="device-select">Select Sensor Zone</Label>
            <Select
              value={selectedZone}
              onValueChange={(value) => setSelectedZone(value as DeviceId)}
              disabled={isMonitoring}
            >
              <SelectTrigger id="device-select">
                <SelectValue placeholder="Select a zone" />
              </SelectTrigger>
              <SelectContent>
                {DEVICE_IDS.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.label} ({device.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-center p-8 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div
                className={cn(
                  'text-7xl font-bold font-headline tabular-nums',
                  isMonitoring
                    ? 'text-primary neon-glow'
                    : 'text-muted-foreground'
                )}
              >
                {Math.round(decibels)}
              </div>
              <div className="text-lg font-medium text-muted-foreground">
                dB
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm text-muted-foreground">
            {isMonitoring ? (
              <Badge
                variant="default"
                className="bg-primary/20 text-primary animate-pulse"
              >
                Monitoring Active
              </Badge>
            ) : (
              <Badge variant="secondary">Status: Stopped</Badge>
            )}
            <div
              className={cn(
                'flex items-center gap-2',
                isOnline ? 'text-green-400' : 'text-red-400'
              )}
            >
              <Wifi size={16} />
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            size="lg"
            variant={isMonitoring ? 'destructive' : 'default'}
            className="w-full"
          >
            {isMonitoring ? <Square className="mr-2" /> : <Radio className="mr-2" />}
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
