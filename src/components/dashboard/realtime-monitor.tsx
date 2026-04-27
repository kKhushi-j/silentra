'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { NoiseGauge } from './noise-gauge';
import { cn } from '@/lib/utils';
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  MicOff,
  Mic,
  Radio,
  Square,
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useAudioAlerts } from '@/hooks/use-audio-alerts';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type NoiseClassification =
  | 'Silent'
  | 'Moderate'
  | 'Warning'
  | 'Critical'
  | 'Emergency';

type RealtimeMonitorProps = {
  onNewData: (decibels: number) => void;
};

const defaultThresholds = { silent: 40, warning: 80, critical: 100 };
const defaultAlertSettings = {
  alertType: 'none',
  voiceMessage: 'Attention: Noise levels are critical.',
};

type MonitoringState = 'stopped' | 'live' | 'simulated';

export function RealtimeMonitor({ onNewData }: RealtimeMonitorProps) {
  const [decibels, setDecibels] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [isNotifMuted, setIsNotifMuted] = useState(true);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(
    null
  );
  const [isAlertPlayedForCurrentEvent, setIsAlertPlayedForCurrentEvent] =
    useState(false);

  const [monitoringState, setMonitoringState] =
    useState<MonitoringState>('stopped');

  const [thresholds, setThresholds] = useState(defaultThresholds);
  const [alertSettings, setAlertSettings] = useState(defaultAlertSettings);

  const { playAlert } = useAudioAlerts();
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const simulatedIntervalId = useRef<NodeJS.Timeout | null>(null);
  const loggingIntervalId = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    try {
      const savedSettingsRaw = localStorage.getItem('silentra_settings');
      if (savedSettingsRaw) {
        const savedSettings = JSON.parse(savedSettingsRaw);
        if (savedSettings.thresholds) {
          setThresholds(savedSettings.thresholds);
        }
        if (savedSettings.alertType) {
          setAlertSettings((s) => ({
            ...s,
            alertType: savedSettings.alertType,
          }));
        }
        if (savedSettings.voiceMessage) {
          setAlertSettings((s) => ({
            ...s,
            voiceMessage: savedSettings.voiceMessage,
          }));
        }
      }
    } catch (e) {
      console.error('Could not parse settings from localStorage', e);
    }
  }, []);

  // Shared function to log current noise to Firestore
  const logNoiseToFirestore = useCallback(async (currentDb: number) => {
    if (monitoringState === 'stopped') return;
    try {
      await addDoc(collection(db, "readings"), {
        zone: "Dashboard",
        level: Math.round(currentDb),
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error("Firestore logging failed:", err);
    }
  }, [monitoringState]);

  const stopMonitoring = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (simulatedIntervalId.current) {
      clearInterval(simulatedIntervalId.current);
      simulatedIntervalId.current = null;
    }
    if (loggingIntervalId.current) {
      clearInterval(loggingIntervalId.current);
      loggingIntervalId.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (audioContextRef.current?.state === 'running') {
      audioContextRef.current?.close();
      audioContextRef.current = null;
    }
    setMonitoringState('stopped');
    setDecibels(0);
    onNewData(0);
  }, [onNewData]);

  const startLiveMonitoring = useCallback(async () => {
    stopMonitoring();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasMicPermission(false);
      toast({
        variant: 'destructive',
        title: 'Audio Capture Not Supported',
        description: 'Your browser does not support microphone access.',
      });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setHasMicPermission(true);
      setMonitoringState('live');

      const audioContext =
        new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      analyser.smoothingTimeConstant = 0.85;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      let latestDb = 0;

      const processAudio = () => {
        if (analyser && audioContextRef.current?.state === 'running') {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;

          const db = 20 + (average / 255) * 100;
          latestDb = Math.min(db, 120);

          setDecibels(latestDb);
          onNewData(latestDb);
          animationFrameId.current = requestAnimationFrame(processAudio);
        }
      };

      processAudio();

      // Start periodic logging to Firestore (every 2 seconds to save quota but still show in charts)
      loggingIntervalId.current = setInterval(() => {
        logNoiseToFirestore(latestDb);
      }, 2000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      setHasMicPermission(false);
      setMonitoringState('stopped');
      toast({
        variant: 'destructive',
        title: 'Microphone Access Denied',
        description:
          'Please enable microphone permissions in your browser settings for live monitoring.',
      });
    }
  }, [onNewData, stopMonitoring, toast, logNoiseToFirestore]);

  const startSimulatedMonitoring = useCallback(() => {
    stopMonitoring();
    setMonitoringState('simulated');
    let currentDb = 55;
    
    simulatedIntervalId.current = setInterval(() => {
      const change = (Math.random() - 0.45) * 15;
      currentDb += change;
      currentDb = Math.max(20, Math.min(110, currentDb));
      setDecibels(currentDb);
      onNewData(currentDb);
    }, 1000);

    loggingIntervalId.current = setInterval(() => {
      logNoiseToFirestore(currentDb);
    }, 2000);

  }, [onNewData, stopMonitoring, logNoiseToFirestore]);

  useEffect(() => {
    return () => stopMonitoring();
  }, [stopMonitoring]);

  const getClassification = useCallback(
    (db: number): NoiseClassification => {
      if (db < thresholds.silent) return 'Silent';
      if (db < thresholds.warning) return 'Moderate';
      if (db < thresholds.critical) return 'Warning';
      if (db < thresholds.critical + 20) return 'Critical';
      return 'Emergency';
    },
    [thresholds]
  );
  
  const classification: NoiseClassification = useMemo(() => {
    if (monitoringState === 'stopped') {
      return 'Silent';
    }
    return getClassification(decibels);
  }, [decibels, getClassification, monitoringState]);

  useEffect(() => {
    const isCritical =
      classification === 'Critical' || classification === 'Emergency';

    if (isCritical && !isAlertPlayedForCurrentEvent && !isAudioMuted) {
      playAlert(alertSettings.alertType as any, alertSettings.voiceMessage);
      setIsAlertPlayedForCurrentEvent(true);
    } else if (!isCritical && isAlertPlayedForCurrentEvent) {
      setIsAlertPlayedForCurrentEvent(false);
    }
  }, [
    classification,
    isAlertPlayedForCurrentEvent,
    isAudioMuted,
    alertSettings,
    playAlert,
  ]);

  const bgColorClass =
    CLASSIFICATION_BG_COLORS[classification] || 'bg-transparent';

  return (
    <Card
      className="relative overflow-hidden transition-all duration-1000 min-h-[440px] flex flex-col group card"
    >
      <div className={cn("absolute inset-0 transition-colors duration-1000 ease-in-out opacity-20", bgColorClass)}></div>
      <CardHeader className="relative z-10">
        <CardTitle className="text-xl font-bold tracking-tight">Real-time Monitor</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center relative z-10">
        {hasMicPermission === false && monitoringState === 'live' ? (
          <div className="flex flex-col items-center justify-center h-full p-4 sm:p-6 animate-fade-in">
            <Alert variant="destructive" className="w-full max-w-sm backdrop-blur-md bg-destructive/10 border-destructive/20">
              <MicOff className="h-4 w-4" />
              <AlertTitle>Microphone Access Required</AlertTitle>
              <AlertDescription>
                Enable microphone permissions in your browser to start live
                monitoring.
              </AlertDescription>
            </Alert>
            <div className="my-8 opacity-50">
              <NoiseGauge decibels={0} classification="Silent" />
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 flex flex-col items-center justify-center relative w-full">
            <div className="absolute top-0 right-4 flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsAudioMuted((p) => !p)}
                      disabled={monitoringState === 'stopped'}
                      className="rounded-full bg-white/5 hover:bg-white/10 transition-transform active:scale-95"
                    >
                      {isAudioMuted ? (
                        <VolumeX className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Volume2 className="h-5 w-5 text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-background/90 backdrop-blur border-white/10">
                    <p>
                      {isAudioMuted
                        ? 'Unmute Audio Alerts'
                        : 'Mute Audio Alerts'}
                    </p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsNotifMuted((p) => !p)}
                      disabled={monitoringState === 'stopped'}
                      className="rounded-full bg-white/5 hover:bg-white/10 transition-transform active:scale-95"
                    >
                      {isNotifMuted ? (
                        <BellOff className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Bell className="h-5 w-5 text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-background/90 backdrop-blur border-white/10">
                    <p>
                      {isNotifMuted
                        ? 'Enable Notifications'
                        : 'Disable Notifications'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="scale-110 transform transition-transform duration-500 my-8">
              <NoiseGauge decibels={decibels} classification={classification} />
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-center items-center gap-4 p-6 border-t border-white/5 relative z-10 bg-black/20">
        {monitoringState === 'stopped' ? (
          <>
            <Button onClick={startLiveMonitoring} size="lg" className="rounded-full shadow-[0_0_15px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.5)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95 font-medium">
              <Mic className="mr-2 h-4 w-4" />
              Live Monitoring
            </Button>
            <Button
              onClick={startSimulatedMonitoring}
              size="lg"
              variant="outline"
              className="rounded-full bg-white/5 hover:bg-white/10 border-white/10 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 font-medium"
            >
              <Radio className="mr-2 h-4 w-4 text-accent" />
              Simulated Mode
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 animate-fade-in w-full">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              <p className="text-sm text-primary font-medium tracking-wide">
                {monitoringState === 'live'
                  ? 'Live Audio Feed Active'
                  : 'Simulation Active'}
              </p>
            </div>
            <Button onClick={stopMonitoring} size="lg" variant="destructive" className="rounded-full shadow-[0_0_15px_hsl(var(--destructive)/0.3)] hover:shadow-[0_0_25px_hsl(var(--destructive)/0.5)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95 font-medium w-full sm:w-auto">
              <Square className="mr-2 h-4 w-4" />
              Stop Monitoring
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

const CLASSIFICATION_BG_COLORS: Record<NoiseClassification, string> = {
  Silent: 'bg-green-500',
  Moderate: 'bg-blue-500',
  Warning: 'bg-yellow-500',
  Critical: 'bg-orange-500',
  Emergency: 'bg-red-500',
};