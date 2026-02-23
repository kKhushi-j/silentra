'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Upload } from 'lucide-react';

const defaultImageUrl =
  PlaceHolderImages.find((img) => img.id === 'room-layout')?.imageUrl ||
  'https://picsum.photos/seed/room-layout/800/600';

const defaultImageHint = 
  PlaceHolderImages.find((img) => img.id === 'room-layout')?.imageHint ||
  'blueprint room';

type Hotspot = {
  id: number;
  x: number;
  y: number;
  intensity: number;
};

const generateHotspots = (count: number): Hotspot[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    intensity: Math.random(),
  }));
};

export function HeatmapView() {
  const [imageUrl, setImageUrl] = useState<string>(defaultImageUrl);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHotspots(generateHotspots(5)); // Start with 5 hotspots

    const interval = setInterval(() => {
      setHotspots((prevHotspots) =>
        prevHotspots.map((h) => ({
          ...h,
          intensity: Math.random(),
          x: h.x + (Math.random() - 0.5) * 2,
          y: h.y + (Math.random() - 0.5) * 2,
        }))
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImageUrl(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="overflow-hidden">
            <CardHeader>
                <CardTitle>Noise Heatmap</CardTitle>
                <CardDescription>
                Live visualization of simulated noisy zones.
                </CardDescription>
            </CardHeader>
          <CardContent>
            <div className="relative aspect-[4/3] w-full rounded-md overflow-hidden bg-muted">
              <Image
                src={imageUrl}
                alt="Room Layout"
                fill
                className="object-contain"
                data-ai-hint={defaultImageHint}
              />
              {hotspots.map((hotspot) => (
                <div
                  key={hotspot.id}
                  className="absolute rounded-full transition-all duration-1000"
                  style={{
                    left: `${hotspot.x}%`,
                    top: `${hotspot.y}%`,
                    width: `${50 + hotspot.intensity * 50}px`,
                    height: `${50 + hotspot.intensity * 50}px`,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: `hsla(0, 100%, 50%, ${0.1 + hotspot.intensity * 0.4})`,
                    boxShadow: `0 0 ${10 + hotspot.intensity * 30}px 5px hsla(0, 100%, 50%, ${0.2 + hotspot.intensity * 0.3})`,
                    animation: 'pulse 2s infinite ease-in-out',
                    animationDelay: `${hotspot.id * 0.2}s`,
                  }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Upload a room layout image to customize the heatmap.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              ref={fileInputRef}
              className="hidden"
            />
            <Button onClick={handleButtonClick} className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              Upload Layout
            </Button>
            <p className="text-xs text-muted-foreground">
              For best results, use a simple floor plan or blueprint image. The
              heatmap is a simulation for demonstrative purposes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Add pulse animation to globals.css if it doesn't exist
// @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
// This is not needed as tailwind has a pulse animation.
