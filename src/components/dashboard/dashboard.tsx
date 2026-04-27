'use client';

import { RealtimeMonitor } from './realtime-monitor';
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart';

type NoiseDataPoint = {
  time: string;
  decibels: number;
};

export function Dashboard() {
  const [noiseHistory, setNoiseHistory] = useState<NoiseDataPoint[]>([]);

  const handleNewData = useCallback((decibels: number) => {
    setNoiseHistory((prev) => {
      const newHistory = [
        ...prev,
        {
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'}),
          decibels,
        },
      ];
      return newHistory.slice(-50); // Keep last 50 data points
    });
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <RealtimeMonitor onNewData={handleNewData} />
      </div>

      <div className="space-y-8 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-semibold tracking-wide">Live Trend</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[250px] p-0 pb-4">
            {noiseHistory.length > 0 ? (
              <ChartContainer config={{}} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={noiseHistory} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.6}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0}/>
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <YAxis domain={['dataMin - 10', 'dataMax + 10']} hide />
                    <ChartTooltip
                      cursor={{ stroke: 'hsl(var(--primary)/0.2)', strokeWidth: 2 }}
                      content={<ChartTooltipContent hideLabel className="bg-background/90 backdrop-blur-xl border-white/10 shadow-2xl" />}
                      formatter={(value, name, props) => [`${(props.payload.decibels as number).toFixed(1)} dB`, props.payload.time]}
                    />
                    <Area
                      dataKey="decibels"
                      type="monotone"
                      fill="url(#colorUv)"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "#fff", strokeWidth: 2, className: "drop-shadow-[0_0_8px_hsl(var(--primary))]" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground/60 font-medium">
                Start monitoring to see live trend data.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
