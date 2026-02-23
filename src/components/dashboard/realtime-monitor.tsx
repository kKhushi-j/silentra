'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { NoiseGauge } from './noise-gauge';
import { cn } from '@/lib/utils';
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

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
  const [decibels, setDecibels] = useState(35);
  const [classification, setClassification] = useState<NoiseClassification>('Silent');
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [isNotifMuted, setIsNotifMuted] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setDecibels((prev) => {
        // Introduce a tendency to revert to a baseline 'moderate' level
        const baseline = 55;
        const pull = (baseline - prev) * 0.05;
        const fluctuation = (Math.random() - 0.48) * 15;
        let newValue = prev + pull + fluctuation;

        // Occasional random spikes
        if (Math.random() > 0.95) {
          newValue += Math.random() * 40;
        }

        newValue = Math.max(20, Math.min(115, newValue));
        onNewData(newValue);
        return newValue;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [onNewData]);

  useEffect(() => {
    const newClassification = getClassification(decibels);
    setClassification(newClassification);
  }, [decibels]);

  const bgColorClass =
    CLASSIFICATION_BG_COLORS[classification] || 'bg-gray-500/10';

  return (
    <Card className={cn('transition-colors duration-500', bgColorClass)}>
      <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center relative">
        <div className="absolute top-4 right-4 flex gap-2">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setIsAudioMuted(p => !p)}>
                    {isAudioMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5 text-primary neon-glow" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{isAudioMuted ? 'Unmute Audio Alerts' : 'Mute Audio Alerts'}</p>
                </TooltipContent>
            </Tooltip>
             <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setIsNotifMuted(p => !p)}>
                    {isNotifMuted ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5 text-primary neon-glow" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{isNotifMuted ? 'Enable Notifications' : 'Disable Notifications'}</p>
                </TooltipContent>
            </Tooltip>
        </div>
        <NoiseGauge decibels={decibels} classification={classification} />
      </CardContent>
    </Card>
  );
}
