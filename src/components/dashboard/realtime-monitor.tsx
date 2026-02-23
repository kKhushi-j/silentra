'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [classification, setClassification] =
    useState<NoiseClassification>('Silent');
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

  const stopMonitoring = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (simulatedIntervalId.current) {
      clearInterval(simulatedIntervalId.current);
      simulatedIntervalId.current = null;
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

      const processAudio = () => {
        if (analyser && audioContextRef.current?.state === 'running') {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;

          const db = 20 + (average / 255) * 100;
          const clampedDb = Math.min(db, 120);

          setDecibels(clampedDb);
          onNewData(clampedDb);
          animationFrameId.current = requestAnimationFrame(processAudio);
        }
      };

      processAudio();
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
  }, [onNewData, stopMonitoring, toast]);

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
  }, [onNewData, stopMonitoring]);

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

  useEffect(() => {
    if (monitoringState === 'stopped') {
      setClassification('Silent');
      return;
    }
    const newClassification = getClassification(decibels);
    setClassification(newClassification);

    const isCritical =
      newClassification === 'Critical' || newClassification === 'Emergency';

    if (isCritical && !isAlertPlayedForCurrentEvent && !isAudioMuted) {
      playAlert(alertSettings.alertType as any, alertSettings.voiceMessage);
      setIsAlertPlayedForCurrentEvent(true);
    } else if (!isCritical && isAlertPlayedForCurrentEvent) {
      setIsAlertPlayedForCurrentEvent(false);
    }
  }, [
    decibels,
    isAlertPlayedForCurrentEvent,
    isAudioMuted,
    alertSettings,
    getClassification,
    playAlert,
    monitoringState,
  ]);

  const bgColorClass =
    CLASSIFICATION_BG_COLORS[classification] || 'bg-gray-500/10';

  const renderContent = () => {
    if (hasMicPermission === false && monitoringState === 'live') {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 sm:p-6">
          <Alert variant="destructive" className="w-full max-w-sm">
            <MicOff className="h-4 w-4" />
            <AlertTitle>Microphone Access Required</AlertTitle>
            <AlertDescription>
              Enable microphone permissions in your browser to start live
              monitoring.
            </AlertDescription>
          </Alert>
          <div className="my-8">
            <NoiseGauge decibels={0} classification="Silent" />
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 sm:p-6 flex flex-col items-center justify-center relative">
        <div className="absolute top-4 right-4 flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsAudioMuted((p) => !p)}
                  disabled={monitoringState === 'stopped'}
                >
                  {isAudioMuted ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5 text-primary neon-glow" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {isAudioMuted ? 'Unmute Audio Alerts' : 'Mute Audio Alerts'}
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
                >
                  {isNotifMuted ? (
                    <BellOff className="h-5 w-5" />
                  ) : (
                    <Bell className="h-5 w-5 text-primary neon-glow" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {isNotifMuted
                    ? 'Enable Notifications'
                    : 'Disable Notifications'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <NoiseGauge decibels={decibels} classification={classification} />
      </div>
    );
  };

  return (
    <Card
      className={cn(
        'transition-colors duration-500 min-h-[440px] flex flex-col',
        bgColorClass
      )}
    >
      <CardHeader>
        <CardTitle>Real-time Monitor</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center">
        {renderContent()}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-center items-center gap-4 p-4 border-t">
        {monitoringState === 'stopped' ? (
          <>
            <Button onClick={startLiveMonitoring} size="lg">
              <Mic className="mr-2 h-4 w-4" />
              Start Live Monitoring
            </Button>
            <Button
              onClick={startSimulatedMonitoring}
              size="lg"
              variant="secondary"
            >
              <Radio className="mr-2 h-4 w-4" />
              Start Simulated Monitoring
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground font-medium">
              {monitoringState === 'live'
                ? 'Live Monitoring Active'
                : 'Simulated Monitoring Active'}
            </p>
            <Button onClick={stopMonitoring} size="lg" variant="destructive">
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
  Silent: 'bg-green-500/10',
  Moderate: 'bg-blue-500/10',
  Warning: 'bg-yellow-500/10',
  Critical: 'bg-orange-500/10',
  Emergency: 'bg-red-500/10',
};
