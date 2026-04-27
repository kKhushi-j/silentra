"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

import { Line, Bar } from "react-chartjs-2";
import { Button } from "@/components/ui/button";
import { Download, Sparkles, Loader2 } from "lucide-react";
import { dailyNoiseAnomalySummary } from "@/ai/flows/daily-noise-anomaly-summary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function AnalyticsPage() {
  const [sensors, setSensors] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const { toast } = useToast();

  // 🔴 Live Sensor Data
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "sensors"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSensors(data);
    });

    return () => unsubscribe();
  }, []);

  // 🔵 Live History Logs (Last 20 updates)
  useEffect(() => {
    const q = query(
      collection(db, "sensors"),
      orderBy("lastUpdated", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setHistory(logs.reverse());
    });

    return () => unsubscribe();
  }, []);

  const handleExportCSV = () => {
    if (history.length === 0) return;
    const headers = ["Sensor", "Level (dB)", "Status", "Last Updated"];
    const csvContent = [
      headers.join(","),
      ...history.map(row => 
        [row.id, row.level || 0, row.status, row.lastUpdated ? new Date(row.lastUpdated.toDate()).toLocaleString() : ''].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `silentra-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateInsights = async () => {
    if (history.length === 0) {
      toast({ title: "No data", description: "Not enough data to generate insights." });
      return;
    }
    setIsGeneratingInsights(true);
    try {
      const formattedLogs = history.map(h => ({
        timestamp: h.lastUpdated ? new Date(h.lastUpdated.toDate()).toISOString() : new Date().toISOString(),
        decibelValue: h.level || 0,
        classification: (h.level || 0) >= 80 ? "Critical" : (h.level || 0) >= 60 ? "Warning" : "Moderate"
      })) as any[];

      const summary = await dailyNoiseAnomalySummary({
        environmentName: "Current Workspace",
        date: new Date().toISOString().split('T')[0],
        noiseLogs: formattedLogs,
        thresholds: { silent: 40, warning: 60, critical: 80 }
      });
      setAiInsights(summary);
      toast({ title: "Insights Generated", description: "AI analysis complete." });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Failed to generate AI insights." });
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // 📈 Line Chart Data
  const lineData = {
    labels: history.map((_, index) => `T${index + 1}`),
    datasets: sensors.map((sensor, i) => ({
      label: sensor.id,
      data: history.map((h) =>
        h.id === sensor.id ? h.level || 0 : null
      ),
      borderColor: `hsl(${i * 120}, 70%, 50%)`,
      backgroundColor: `hsl(${i * 120}, 70%, 50%)`,
      tension: 0.3,
    })),
  };

  // 📊 Bar Chart Data
  const barData = {
    labels: sensors.map((s) => s.id),
    datasets: [
      {
        label: "Current Noise Level",
        data: sensors.map((s) => s.level || 0),
        backgroundColor: sensors.map(
          (_, i) => `hsl(${i * 120}, 70%, 50%)`
        ),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-transparent p-6 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Real-Time Noise Analytics
        </h1>
        <div className="flex items-center gap-3">
          <Button onClick={handleGenerateInsights} disabled={isGeneratingInsights} variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30 border-primary/20">
            {isGeneratingInsights ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            AI Insights
          </Button>
          <Button onClick={handleExportCSV} variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {aiInsights && (
        <Card className="card animate-fade-in border-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.1)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary font-headline tracking-wide">
              <Sparkles className="h-5 w-5" /> AI Analysis Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-foreground/90">
            <p className="leading-relaxed">{aiInsights.summary}</p>
            <div className="bg-primary/10 p-4 rounded-xl border border-primary/20">
              <h4 className="font-semibold mb-2 text-primary">Key Insights</h4>
              <p className="leading-relaxed">{aiInsights.insights}</p>
            </div>
            {aiInsights.anomalies?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Detected Anomalies</h4>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  {aiInsights.anomalies.map((a: any, i: number) => (
                    <li key={i}>{a.classification} ({a.decibelValue}dB) at {new Date(a.timestamp).toLocaleTimeString()}: {a.details}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* STATUS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sensors.map((sensor) => (
          <div
            key={sensor.id}
            className="card p-6 text-center group"
          >
            <h2 className="text-xl font-semibold">{sensor.id}</h2>
            <p className="text-5xl font-bold mt-4 font-headline text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)] group-hover:scale-110 transition-transform">
              {sensor.level || 0}
            </p>
            <p className="text-sm mt-4 text-muted-foreground uppercase tracking-widest font-semibold">
              Status: <span className={sensor.status === 'online' ? 'text-green-500' : 'text-red-500'}>{sensor.status}</span>
            </p>
          </div>
        ))}
      </div>

      {/* LINE CHART */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-6 tracking-wide">
          Noise Trend (Live Updates)
        </h2>
        <div className="h-[400px]">
          <Line 
            data={lineData} 
            options={{ 
              responsive: true, 
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  labels: { color: 'hsl(0, 0%, 90%)' }
                }
              },
              scales: {
                y: {
                  ticks: { color: 'hsl(0, 0%, 70%)' },
                  grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                  ticks: { color: 'hsl(0, 0%, 70%)' },
                  grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
              }
            }} 
          />
        </div>
      </div>

      {/* BAR CHART */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-6 tracking-wide">
          Current Sensor Comparison
        </h2>
        <div className="h-[400px]">
          <Bar 
            data={barData} 
            options={{ 
              responsive: true, 
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  labels: { color: 'hsl(0, 0%, 90%)' }
                }
              },
              scales: {
                y: {
                  ticks: { color: 'hsl(0, 0%, 70%)' },
                  grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                  ticks: { color: 'hsl(0, 0%, 70%)' },
                  grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
              }
            }}
          />
        </div>
      </div>

      {/* DATA LOG TABLE */}
      <div className="card p-6 overflow-x-auto">
        <h2 className="text-xl font-semibold mb-6 tracking-wide">
          Recent Activity Logs
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="p-3 text-left font-medium text-muted-foreground">Sensor</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Level</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((log, index) => (
              <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-3 font-medium">{log.id}</td>
                <td className="p-3 font-mono font-bold text-primary">{log.level || 0} dB</td>
                <td className="p-3">
                   <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${log.status === 'online' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                    {log.status}
                   </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
