'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { NoiseGauge } from './noise-gauge';
import { cn } from '@/lib/utils';
import { Bell, BellOff, Volume2, VolumeX, MicOff } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

export type NoiseClassification =
  | 'Silent'
  | 'Moderate'
  | 'Warning'
  | 'Critical'
  | 'Emergency';

type RealtimeMonitorProps = {
  onNewData: (decibels: number) => void;
};

const getClassification = (db: number): NoiseClassification => {
  if (db < 40) return 'Silent';
  if (db < 60) return 'Moderate';
  if (db < 80) return 'Warning';
  if (db < 100) return 'Critical';
  return 'Emergency';
};

const CLASSIFICATION_BG_COLORS: Record<NoiseClassification, string> = {
  Silent: 'bg-green-500/10',
  Moderate: 'bg-blue-500/10',
  Warning: 'bg-yellow-500/10',
  Critical: 'bg-orange-500/10',
  Emergency: 'bg-red-500/10',
};

export function RealtimeMonitor({ onNewData }: RealtimeMonitorProps) {
  const [decibels, setDecibels] = useState(0);
  const [classification, setClassification] =
    useState<NoiseClassification>('Silent');
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [isNotifMuted, setIsNotifMuted] = useState(true);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(
    null
  );
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getMicPermission = async () => {
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

        const audioContext = new (window.AudioContext ||
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
        toast({
          variant: 'destructive',
          title: 'Microphone Access Denied',
          description:
            'Please enable microphone permissions in your browser settings for live monitoring.',
        });
      }
    };

    getMicPermission();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioContextRef.current?.state === 'running') {
        audioContextRef.current?.close();
      }
    };
  }, [onNewData, toast]);

  useEffect(() => {
    const newClassification = getClassification(decibels);
    setClassification(newClassification);
  }, [decibels]);

  const bgColorClass =
    CLASSIFICATION_BG_COLORS[classification] || 'bg-gray-500/10';

  if (hasMicPermission === false) {
    return (
      <Card
        className={cn(
          'transition-colors duration-500',
          bgColorClass,
          'min-h-[440px]'
        )}
      >
        <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center h-full">
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
        </CardContent>
      </Card>
    );
  }

  if (hasMicPermission === null) {
    return (
      <Card
        className={cn(
          'transition-colors duration-500',
          bgColorClass,
          'min-h-[440px]'
        )}
      >
        <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center h-full">
          <p>Requesting microphone access...</p>
          <div className="my-8">
            <NoiseGauge decibels={0} classification="Silent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('transition-colors duration-500', bgColorClass)}>
      <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center relative">
        <div className="absolute top-4 right-4 flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsAudioMuted((p) => !p)}
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
      </CardContent>
    </Card>
  );
}
