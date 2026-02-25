"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartTooltip,
  ChartTooltipContent,
  ChartContainer,
} from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import type { ChartConfig } from '@/components/ui/chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import { dailyNoiseAnomalySummary } from '@/ai/flows/daily-noise-anomaly-summary';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type NoiseData = {
  time: Date;
  decibels: number;
  zone: string;
  classification: 'Silent' | 'Moderate' | 'Warning' | 'Critical' | 'Emergency';
};

const defaultThresholds = { silent: 40, warning: 80, critical: 100 };

const chartConfig = {
  decibels: {
    label: 'Decibels (dB)',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

function AIGeneration({ data, thresholds }: { data: NoiseData[], thresholds: any }) {
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateSummary = async () => {
    if (data.length === 0) {
      toast({ title: "No data", description: "Wait for real sensor data to arrive." });
      return;
    }
    setIsLoading(true);
    setSummary(null);
    try {
      const result = await dailyNoiseAnomalySummary({
        environmentName: 'Silentra Protected Zone',
        date: new Date().toISOString().split('T')[0],
        noiseLogs: data.map((d) => ({
          timestamp: d.time.toISOString(),
          decibelValue: d.decibels,
          classification: d.classification,
        })),
        thresholds: thresholds,
      });
      setSummary(result);
    } catch (error) {
      console.error('AI summary generation failed:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate AI summary. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily AI Summary</CardTitle>
        <CardDescription>
          Let SilentraAI analyze real-time recordings to find anomalies and
          provide insights.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleGenerateSummary} disabled={isLoading}>
          {isLoading ? 'Analyzing...' : 'Generate AI Summary'}
        </Button>
        {isLoading && (
          <div className="space-y-4 mt-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}
        {summary && (
          <div className="mt-6 space-y-4 text-sm">
            <h3 className="font-semibold text-lg">Analysis for {summary.date}</h3>
            <p>
              <strong className="text-primary">Overall Summary:</strong>{' '}
              {summary.summary}
            </p>
            <div>
              <strong className="text-primary">Key Insights & Recommendations:</strong>
              <p>{summary.insights}</p>
            </div>
            <div>
              <strong className="text-primary">Peak Noise Events:</strong>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                {summary.peakNoiseEvents.map((event: any, index: number) => (
                  <li key={index}>
                    {new Date(event.timestamp).toLocaleTimeString()}:{' '}
                    <strong>{event.decibelValue} dB</strong> (
                    {event.classification})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalyticsView() {
  const [data, setData] = useState<NoiseData[]>([]);
  const [timeRange, setTimeRange] = useState('6h');
  const [thresholds, setThresholds] = useState(defaultThresholds);
  const { toast } = useToast();

  useEffect(() => {
    // Load thresholds
    const savedSettings = localStorage.getItem('silentra_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.thresholds) setThresholds(parsed.thresholds);
      } catch (e) {}
    }

    const getClassification = (db: number) => {
      if (db <= thresholds.silent) return 'Silent';
      if (db <= thresholds.warning) return 'Moderate';
      if (db <= thresholds.critical) return 'Warning';
      if (db <= thresholds.critical + 20) return 'Critical';
      return 'Emergency';
    };

    // Listen for REAL readings
    const q = query(
      collection(db, "readings"),
      orderBy("timestamp", "desc"),
      limit(200)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const readings = snapshot.docs.map(doc => {
        const d = doc.data();
        const level = d.level || 0;
        return {
          time: d.timestamp?.toDate() || new Date(),
          decibels: level,
          zone: d.zone || 'Unknown',
          classification: getClassification(level)
        } as NoiseData;
      }).sort((a, b) => a.time.getTime() - b.time.getTime());
      
      setData(readings);
    }, (error) => {
      console.error("Firestore reading error:", error);
      toast({ variant: "destructive", title: "Data Error", description: "Failed to fetch real-time analytics data." });
    });

    return () => unsubscribe();
  }, [thresholds, toast]);

  const filteredData = useMemo(() => {
    const now = new Date();
    const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : 24;
    const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);
    return data.filter((d) => d.time > cutoff);
  }, [data, timeRange]);

  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;
    const decibels = filteredData.map((d) => d.decibels);
    const peak = Math.max(...decibels);
    const avg = decibels.reduce((sum, val) => sum + val, 0) / decibels.length;
    const warnings = filteredData.filter(
      (d) =>
        d.classification === 'Warning' ||
        d.classification === 'Critical' ||
        d.classification === 'Emergency'
    ).length;
    return { peak, avg, warnings };
  }, [filteredData]);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Zap className="w-12 h-12 text-muted-foreground animate-pulse" />
        <h2 className="text-xl font-semibold">Waiting for sensor data...</h2>
        <p className="text-muted-foreground">Start a sensor from the sensor dashboard to see real-time analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Noise (Real)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avg.toFixed(1) ?? '...'} dB
            </div>
            <p className="text-xs text-muted-foreground">
              Across the last {timeRange}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Noise (Real)</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.peak ?? '...'} dB</div>
            <p className="text-xs text-muted-foreground">
              Highest level recorded in last {timeRange}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Real Anomalies
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.warnings ?? '...'}</div>
            <p className="text-xs text-muted-foreground">
              Warning-level events or higher
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="chart">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="log">Log</TabsTrigger>
            <TabsTrigger value="ai">AI Summary</TabsTrigger>
          </TabsList>
          <div className="hidden sm:block">
            <Tabs value={timeRange} onValueChange={setTimeRange}>
              <TabsList>
                <TabsTrigger value="1h">1H</TabsTrigger>
                <TabsTrigger value="6h">6H</TabsTrigger>
                <TabsTrigger value="24h">24H</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle>Real Noise Levels Over Time</CardTitle>
              <CardDescription>
                Live data streams from your active sensors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-72 w-full">
                <AreaChart
                  data={filteredData}
                  margin={{ top: 5, right: 20, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tickFormatter={(tick) => new Date(tick).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis
                    domain={[0, 120]}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <ChartTooltip
                    cursor={{
                      stroke: 'hsl(var(--accent))',
                      strokeWidth: 1,
                      strokeDasharray: '3 3',
                    }}
                    content={<ChartTooltipContent />}
                  />
                  <Area
                    dataKey="decibels"
                    type="monotone"
                    fill="hsl(var(--primary) / 0.2)"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="log">
          <Card>
            <CardHeader>
              <CardTitle>Live Device Log</CardTitle>
              <CardDescription>
                Historical logs being recorded from active zones.
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-[30rem] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Classification</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData
                    .slice()
                    .reverse()
                    .map((entry, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {entry.time.toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.zone}</Badge>
                        </TableCell>
                        <TableCell>{entry.decibels} dB</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              entry.classification === 'Critical' ||
                              entry.classification === 'Emergency'
                                ? 'destructive'
                                : entry.classification === 'Warning'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {entry.classification}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="ai">
          <AIGeneration data={filteredData} thresholds={thresholds} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
