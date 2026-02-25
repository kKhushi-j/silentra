'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
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
  const [selectedDevice, setSelectedDevice] = useState<DeviceId>('Mic_A');
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(
    null
  );
  const [isOnline, setIsOnline] = useState(false);

  const db = useFirestore();
  const { toast } = useToast();

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const selectedDeviceRef = useRef(selectedDevice);
  useEffect(() => {
    selectedDeviceRef.current = selectedDevice;
  }, [selectedDevice]);

  const dbRef = useRef(db);
  useEffect(() => {
    dbRef.current = db;
  }, [db]);
  
  const isOnlineRef = useRef(isOnline);
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  const writeToFirestore = useCallback(async (dbLevel: number) => {
    const currentDb = dbRef.current;
    const deviceId = selectedDeviceRef.current;
    
    console.log("Selected Sensor ID:", deviceId);
  
    console.log("DB instance:", currentDb);
    if (!currentDb) {
      console.error("DB is undefined!");
      return;
    }
  
    try {
      console.log("Writing to Firestore:", deviceId);
      const deviceRef = doc(currentDb, "devices", deviceId);
  
      await setDoc(deviceRef, {
        level: Math.round(dbLevel),
        status: "online",
        lastUpdated: serverTimestamp()
      }, { merge: true });
  
      console.log("Write success");
      if (!isOnlineRef.current) setIsOnline(true);
    } catch (error) {
      console.error("Firestore ERROR:", error);
      if (isOnlineRef.current) setIsOnline(false);
    }
  }, []);


  const startMonitoring = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({
        variant: 'destructive',
        title: 'Not Supported',
        description: 'Your browser does not support microphone access.',
      });
      setHasMicPermission(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setHasMicPermission(true);

      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (context.state === 'suspended') await context.resume();
      audioContextRef.current = context;

      const source = context.createMediaStreamSource(stream);
      analyserRef.current = context.createAnalyser();
      analyserRef.current.fftSize = 2048;
      source.connect(analyserRef.current);
      
      setIsMonitoring(true);

      let lastWriteTime = 0;
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const loop = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteTimeDomainData(dataArray);

        let sumSquares = 0.0;
        for (const amplitude of dataArray) {
          const normalizedAmplitude = amplitude / 128.0 - 1.0;
          sumSquares += normalizedAmplitude * normalizedAmplitude;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        const effectiveRms = Math.max(rms, 0.00001);
        let dbValue = 20 * Math.log10(effectiveRms) + 94;
        dbValue = Math.max(20, Math.min(120, dbValue));

        setDecibels(dbValue);

        const now = Date.now();
        if (now - lastWriteTime > 1000) {
          lastWriteTime = now;
          writeToFirestore(dbValue);
        }

        animationFrameRef.current = requestAnimationFrame(loop);
      };

      loop();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setHasMicPermission(false);
      setIsMonitoring(false);
      toast({
        variant: 'destructive',
        title: 'Microphone Access Denied',
        description: 'Please enable microphone access in your browser settings.',
      });
    }
  }, [toast, writeToFirestore]);

  const stopMonitoring = useCallback(async () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      await audioContextRef.current.close();
    }
    audioContextRef.current = null;
    analyserRef.current = null;
    
    const currentDb = dbRef.current;
    const deviceId = selectedDeviceRef.current;
    if (currentDb && deviceId) {
      try {
        await setDoc(doc(currentDb, 'devices', deviceId), { status: 'offline' }, { merge: true });
      } catch (error) {
        console.error('Error setting device to offline:', error);
      }
    }

    setIsMonitoring(false);
    setDecibels(0);
    setIsOnline(false);
  }, []);

  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

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
              value={selectedDevice}
              onValueChange={(value) => setSelectedDevice(value as DeviceId)}
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
          {!isMonitoring ? (
            <Button onClick={startMonitoring} size="lg" className="w-full">
              <Radio className="mr-2" /> Start Monitoring
            </Button>
          ) : (
            <Button
              onClick={stopMonitoring}
              size="lg"
              variant="destructive"
              className="w-full"
            >
              <Square className="mr-2" /> Stop Monitoring
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
