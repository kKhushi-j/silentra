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
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  
  const db = useFirestore();
  const { toast } = useToast();

  // Refs for audio processing and avoiding re-render issues
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const lastWriteTimeRef = useRef<number>(0);
  const valueHistoryRef = useRef<number[]>([]);

  const sendDataToFirestore = useCallback(async (dbValue: number) => {
    if (!db || !selectedDevice) return;
    try {
      const deviceRef = doc(db, 'devices', selectedDevice);
      await setDoc(deviceRef, {
        decibel: dbValue,
        timestamp: serverTimestamp(),
        zone: DEVICE_IDS.find(d => d.id === selectedDevice)?.label,
        status: 'online',
      }, { merge: true });
      if (!isOnline) setIsOnline(true);
    } catch (error) {
      console.error("Firestore write error:", error);
      if (isOnline) setIsOnline(false);
      // We don't stop monitoring here, just log the error.
    }
  }, [db, selectedDevice, isOnline]);
  
  const processAudio = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.fftSize);
    analyserRef.current.getByteTimeDomainData(dataArray);

    let sumSquares = 0.0;
    for (const amplitude of dataArray) {
        const normalizedAmplitude = (amplitude / 128.0) - 1.0;
        sumSquares += normalizedAmplitude * normalizedAmplitude;
    }
    const rms = Math.sqrt(sumSquares / dataArray.length);
    
    let db = 20 * Math.log10(rms) + 90; // Calibrated for more realistic room noise
    db = Math.max(0, Math.min(120, db));

    valueHistoryRef.current.push(db);
    if (valueHistoryRef.current.length > 5) valueHistoryRef.current.shift();
    const smoothedDb = valueHistoryRef.current.reduce((a, b) => a + b, 0) / valueHistoryRef.current.length;

    setDecibels(smoothedDb);
    
    const now = Date.now();
    if (now - lastWriteTimeRef.current > 1000) {
        sendDataToFirestore(smoothedDb);
        lastWriteTimeRef.current = now;
    }

    animationFrameId.current = requestAnimationFrame(processAudio);
  }, [sendDataToFirestore]);

  const startMonitoring = useCallback(async () => {
    console.log("Attempting to start monitoring...");
    if (isMonitoring) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      toast({ variant: 'destructive', title: 'Not Supported', description: 'Your browser does not support microphone access.' });
      setHasMicPermission(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setHasMicPermission(true);

      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (context.state === 'suspended') {
        await context.resume();
      }
      audioContextRef.current = context;

      const source = context.createMediaStreamSource(stream);
      analyserRef.current = context.createAnalyser();
      analyserRef.current.fftSize = 2048;
      source.connect(analyserRef.current);
      
      setIsMonitoring(true);
      lastWriteTimeRef.current = 0;
      valueHistoryRef.current = [];
      animationFrameId.current = requestAnimationFrame(processAudio);
      console.log("Monitoring started successfully.");

    } catch (err) {
      console.error('Error accessing microphone:', err);
      setHasMicPermission(false);
      toast({ variant: 'destructive', title: 'Microphone Access Denied', description: 'Please enable microphone access in your browser settings.'});
    }
  }, [isMonitoring, processAudio, toast]);

  const stopMonitoring = useCallback(async () => {
    console.log("Stopping monitoring...");
    if (!isMonitoring) return;

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (db && selectedDevice) {
      try {
        await setDoc(doc(db, 'devices', selectedDevice), {
            decibel: 0,
            status: 'offline',
            timestamp: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.error("Error setting device to offline:", error);
      }
    }

    setIsMonitoring(false);
    setDecibels(0);
    setIsOnline(false);
    valueHistoryRef.current = [];
    console.log("Monitoring stopped.");
  }, [isMonitoring, db, selectedDevice]);

  useEffect(() => {
    // Cleanup on component unmount
    return () => {
      if (isMonitoring) {
        stopMonitoring();
      }
    };
  }, [isMonitoring, stopMonitoring]);


  return (
    <div className="flex justify-center items-center p-4 h-full">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sensor Emulator</CardTitle>
          <CardDescription>
            Use your device's microphone to simulate a remote noise sensor and send data to Firestore.
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
                <div className={cn(
                    "text-7xl font-bold font-headline tabular-nums",
                    isMonitoring ? 'text-primary neon-glow' : 'text-muted-foreground'
                )}>
                    {Math.round(decibels)}
                </div>
                <div className="text-lg font-medium text-muted-foreground">dB</div>
             </div>
          </div>
          
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            {isMonitoring ? (
                <Badge variant="default" className="bg-primary/20 text-primary animate-pulse">Monitoring Active</Badge>
            ) : (
                <Badge variant="secondary">Status: Stopped</Badge>
            )}
            <div className={cn(
                "flex items-center gap-2",
                isOnline ? 'text-green-400' : 'text-red-400'
            )}>
                <Wifi size={16} />
                <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          {!isMonitoring ? (
            <Button onClick={startMonitoring} size="lg" className="w-full">
              <Radio className="mr-2" /> Start Monitoring
            </Button>
          ) : (
            <Button onClick={stopMonitoring} size="lg" variant="destructive" className="w-full">
              <Square className="mr-2" /> Stop Monitoring
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
