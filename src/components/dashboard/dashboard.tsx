'use client';

import { RealtimeMonitor } from './realtime-monitor';
import { PredictiveAlert } from './predictive-alert';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart';

type NoiseDataPoint = {
  time: string;
  decibels: number;
};

export function Dashboard() {
  const [noiseHistory, setNoiseHistory] = useState<NoiseDataPoint[]>([]);

  useEffect(() => {
    const initialHistory: NoiseDataPoint[] = Array.from({ length: 50 }, (_, i) => ({
      time: new Date(Date.now() - (50 - i) * 2000).toLocaleTimeString(),
      decibels: 40 + Math.random() * 15,
    }));
    setNoiseHistory(initialHistory);
  }, []);

  const handleNewData = (decibels: number) => {
    setNoiseHistory((prev) => {
      const newHistory = [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          decibels,
        },
      ];
      return newHistory.slice(-50); // Keep last 50 data points
    });
  };

  const recentNoiseValues = noiseHistory.map(d => d.decibels).slice(-20);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <RealtimeMonitor onNewData={handleNewData} />
      </div>

      <div className="space-y-6">
        <PredictiveAlert lastNoiseValues={recentNoiseValues} />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-40">
            <ChartContainer config={{}} className="h-full w-full">
              <AreaChart data={noiseHistory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Area
                  dataKey="decibels"
                  type="natural"
                  fill="url(#colorUv)"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
