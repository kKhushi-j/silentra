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
import { Mic, MicOff, Square, Radio, Wifi } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { cn } from '@/lib/utils';

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

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const firestoreIntervalId = useRef<NodeJS.Timeout | null>(null);

  const stopMonitoring = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    if (firestoreIntervalId.current) {
      clearInterval(firestoreIntervalId.current);
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }

    streamRef.current = null;
    audioContextRef.current = null;
    setIsMonitoring(false);
    setDecibels(0);
    setIsOnline(false);
  }, []);

  const sendDataToFirestore = useCallback(async (currentDecibels: number) => {
    if (!db || !selectedDevice) return;
    try {
      const deviceRef = doc(db, 'devices', selectedDevice);
      await setDoc(deviceRef, {
        decibel: currentDecibels,
        timestamp: serverTimestamp(),
        zone: DEVICE_IDS.find(d => d.id === selectedDevice)?.label,
      });
      setIsOnline(true);
    } catch (error) {
      console.error("Error writing to Firestore: ", error);
      setIsOnline(false);
      toast({
        variant: 'destructive',
        title: 'Firestore Error',
        description: 'Could not send data to server.',
      });
    }
  }, [db, selectedDevice, toast]);

  const processAudio = useCallback(() => {
    if (analyserRef.current && dataArrayRef.current) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      let sum = 0;
      for (const value of dataArrayRef.current) {
        sum += value;
      }
      const average = sum / dataArrayRef.current.length;
      const db = 20 + (average / 255) * 100;
      const clampedDb = Math.min(Math.max(db, 0), 120);
      setDecibels(clampedDb);
      animationFrameId.current = requestAnimationFrame(processAudio);
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

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      analyser.smoothingTimeConstant = 0.85;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      
      setIsMonitoring(true);
      processAudio();

      if (firestoreIntervalId.current) clearInterval(firestoreIntervalId.current);
      firestoreIntervalId.current = setInterval(() => {
        setDecibels(currentDb => {
          sendDataToFirestore(currentDb);
          return currentDb;
        });
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      setHasMicPermission(false);
      toast({
        variant: 'destructive',
        title: 'Microphone Access Denied',
        description: 'Please enable microphone access in your browser settings.',
      });
    }
  }, [processAudio, sendDataToFirestore, toast]);

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
            <span>Status: {isMonitoring ? 'Monitoring' : 'Stopped'}</span>
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
