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
    <div className="min-h-screen bg-background p-6 space-y-8">
      <h1 className="text-3xl font-bold text-center">
        Real-Time Noise Analytics
      </h1>

      {/* STATUS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sensors.map((sensor) => (
          <div
            key={sensor.id}
            className="bg-card p-6 rounded-lg border border-border shadow-md text-center"
          >
            <h2 className="text-xl font-semibold">{sensor.id}</h2>
            <p className="text-4xl font-bold mt-2">
              {sensor.level || 0}
            </p>
            <p className="text-sm mt-2 text-muted-foreground">
              Status: {sensor.status}
            </p>
          </div>
        ))}
      </div>

      {/* LINE CHART */}
      <div className="bg-card p-6 rounded-lg border border-border shadow-md">
        <h2 className="text-xl font-semibold mb-4">
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
                  labels: {
                    color: 'hsl(215.4, 16.3%, 56.9%)'
                  }
                }
              },
              scales: {
                y: {
                  ticks: { color: 'hsl(215.4, 16.3%, 56.9%)' },
                  grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                  ticks: { color: 'hsl(215.4, 16.3%, 56.9%)' },
                  grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
              }
            }} 
          />
        </div>
      </div>

      {/* BAR CHART */}
      <div className="bg-card p-6 rounded-lg border border-border shadow-md">
        <h2 className="text-xl font-semibold mb-4">
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
                  labels: {
                    color: 'hsl(215.4, 16.3%, 56.9%)'
                  }
                }
              },
              scales: {
                y: {
                  ticks: { color: 'hsl(215.4, 16.3%, 56.9%)' },
                  grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                  ticks: { color: 'hsl(215.4, 16.3%, 56.9%)' },
                  grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
              }
            }}
          />
        </div>
      </div>

      {/* DATA LOG TABLE */}
      <div className="bg-card p-6 rounded-lg border border-border shadow-md overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4">
          Recent Activity Logs
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="p-2 text-left">Sensor</th>
              <th className="p-2 text-left">Level</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((log, index) => (
              <tr key={index} className="border-b border-border/50">
                <td className="p-2">{log.id}</td>
                <td className="p-2 font-mono font-bold text-primary">{log.level || 0} dB</td>
                <td className="p-2">
                   <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${log.status === 'online' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
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
