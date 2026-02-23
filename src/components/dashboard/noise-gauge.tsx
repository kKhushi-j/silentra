'use client';

import { cn } from '@/lib/utils';
import type { NoiseClassification } from './realtime-monitor';

type NoiseGaugeProps = {
  decibels: number;
  classification: NoiseClassification;
};

const CLASSIFICATION_COLORS: Record<NoiseClassification, string> = {
  Silent: 'text-green-400',
  Moderate: 'text-blue-400',
  Warning: 'text-yellow-400',
  Critical: 'text-orange-500',
  Emergency: 'text-red-600',
};

export function NoiseGauge({ decibels, classification }: NoiseGaugeProps) {
  const percentage = Math.min(decibels / 120, 1);
  const circumference = 2 * Math.PI * 90; // 2 * pi * radius
  const strokeDashoffset = circumference - percentage * circumference;

  const colorClass = CLASSIFICATION_COLORS[classification] || 'text-gray-400';

  return (
    <div className="relative flex items-center justify-center w-64 h-64 md:w-80 md:h-80">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
        <circle
          cx="100"
          cy="100"
          r="90"
          stroke="currentColor"
          strokeWidth="10"
          fill="transparent"
          className="text-primary/10"
        />
        <circle
          cx="100"
          cy="100"
          r="90"
          stroke="currentColor"
          strokeWidth="10"
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn('transition-all duration-500 ease-in-out', colorClass)}
          style={{
            filter: `drop-shadow(0 0 5px currentColor)`,
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span
          className={cn(
            'text-6xl md:text-7xl font-bold font-headline tabular-nums transition-colors duration-300',
            colorClass
          )}
        >
          {Math.round(decibels)}
        </span>
        <span className="text-lg font-medium text-muted-foreground">dB</span>
        <span
          className={cn(
            'mt-2 text-xl font-semibold transition-colors duration-300',
            colorClass
          )}
        >
          {classification}
        </span>
      </div>
    </div>
  );
}
