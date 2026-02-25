"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Map as MapIcon, Upload } from "lucide-react";

const defaultThresholds = { silent: 30, warning: 60, critical: 80 };

export default function HeatmapPage() {
  const [sensors, setSensors] = useState<any[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [thresholds, setThresholds] = useState(defaultThresholds);

  useEffect(() => {
    // Load thresholds from settings
    const savedSettings = localStorage.getItem('silentra_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.thresholds) {
          setThresholds(parsed.thresholds);
        }
      } catch (e) {
        console.error("Error parsing settings", e);
      }
    }

    const unsubscribe = onSnapshot(collection(db, "sensors"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSensors(data);
    });

    return () => unsubscribe();
  }, []);

  const getColor = (level: number) => {
    if (level <= thresholds.silent) return "rgba(34, 197, 94, 0.8)"; // green-500
    if (level <= thresholds.warning) return "rgba(249, 115, 22, 0.85)"; // orange-500
    return "rgba(239, 68, 68, 0.85)"; // red-500
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const positions: Record<string, { x: number; y: number }> = {
    Mic_A: { x: 120, y: 100 },
    Mic_B: { x: 400, y: 180 },
    Mic_C: { x: 250, y: 300 },
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <MapIcon className="w-8 h-8 text-primary neon-glow" />
        <h1 className="text-3xl font-bold font-headline">Live Noise Heatmap</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Room Layout</CardTitle>
          <CardDescription>
            Upload your environment floor plan to visualize real-time noise distribution based on current thresholds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full max-w-sm items-center gap-1.5 mb-6">
            <Label htmlFor="floorplan">Floor Plan Image</Label>
            <div className="flex gap-2">
              <Input id="floorplan" type="file" accept="image/*" onChange={handleImageUpload} className="cursor-pointer" />
            </div>
          </div>

          <div className="relative w-full aspect-[16/10] bg-muted/30 rounded-lg border-2 border-dashed border-border/50 overflow-hidden group">
            {image ? (
              <img
                src={image}
                alt="Room Layout"
                className="absolute inset-0 w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Upload className="w-10 h-10 opacity-20" />
                <p>Upload a room layout image to begin</p>
              </div>
            )}

            {image &&
              sensors.map((sensor) => {
                const pos = positions[sensor.id];
                if (!pos) return null;

                const color = getColor(sensor.level || 0);

                return (
                  <div
                    key={sensor.id}
                    className="absolute rounded-full flex flex-col items-center justify-center text-white text-[10px] font-bold z-10"
                    style={{
                      left: `${(pos.x / 800) * 100}%`,
                      top: `${(pos.y / 500) * 100}%`,
                      width: 50,
                      height: 50,
                      backgroundColor: color,
                      boxShadow: `0 0 30px 15px ${color}`,
                      transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <span className="leading-none">{sensor.id}</span>
                    <span className="text-sm">{sensor.level || 0}</span>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-8 justify-center">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
              <span className="text-sm font-medium">Low (&le; {thresholds.silent}dB)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
              <span className="text-sm font-medium">Moderate ({thresholds.silent + 1}-{thresholds.warning}dB)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
              <span className="text-sm font-medium">High (&gt; {thresholds.warning}dB)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}