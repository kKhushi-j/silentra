"use client";

import { useEffect, useState, useRef } from "react";
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Map as MapIcon, Upload, Volume2, VolumeX, Bell, BellOff, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAudioAlerts } from "@/hooks/use-audio-alerts";
import { useToast } from "@/hooks/use-toast";

const defaultThresholds = { silent: 30, warning: 60, critical: 80 };
const defaultAlertSettings = {
  alertType: 'none',
  voiceMessage: 'Attention: Noise levels are critical.',
  adminContact: ''
};

// Default fallback positions if Firestore doesn't have them (as percentages)
const DEFAULT_POSITIONS: Record<string, { x: number; y: number }> = {
  Mic_A: { x: 15, y: 20 },
  Mic_B: { x: 50, y: 36 },
  Mic_C: { x: 31.25, y: 60 },
};

export default function HeatmapPage() {
  const [sensors, setSensors] = useState<any[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [thresholds, setThresholds] = useState(defaultThresholds);
  const [alertSettings, setAlertSettings] = useState(defaultAlertSettings);
  
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [isNotifMuted, setIsNotifMuted] = useState(true);
  const [isAlertPlayedForCurrentEvent, setIsAlertPlayedForCurrentEvent] = useState(false);
  const [consecutiveCriticalStart, setConsecutiveCriticalStart] = useState<number | null>(null);
  const [hasNotifiedAdmin, setHasNotifiedAdmin] = useState(false);

  // Dragging and Edit Mode states
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggingSensorId, setDraggingSensorId] = useState<string | null>(null);
  const [dragTempPos, setDragTempPos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const { playAlert } = useAudioAlerts();
  const { toast } = useToast();

  useEffect(() => {
    // Load thresholds and alert settings
    const savedSettings = localStorage.getItem('silentra_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.thresholds) setThresholds(parsed.thresholds);
        setAlertSettings({
          alertType: parsed.alertType || 'none',
          voiceMessage: parsed.voiceMessage || 'Attention: Noise levels are critical.',
          adminContact: parsed.adminContact || ''
        });
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

  // Monitor sensor levels for alerts and notifications
  useEffect(() => {
    const isAnyCritical = sensors.some(s => (s.level || 0) > thresholds.critical);

    // Audio Alert Logic
    if (isAnyCritical && !isAlertPlayedForCurrentEvent && !isAudioMuted) {
      playAlert(alertSettings.alertType as any, alertSettings.voiceMessage);
      setIsAlertPlayedForCurrentEvent(true);
    } else if (!isAnyCritical) {
      setIsAlertPlayedForCurrentEvent(false);
    }

    // Admin Notification Logic (10 seconds consecutive)
    if (isAnyCritical) {
      if (consecutiveCriticalStart === null) {
        setConsecutiveCriticalStart(Date.now());
      } else if (Date.now() - consecutiveCriticalStart >= 10000) {
        if (!hasNotifiedAdmin && !isNotifMuted) {
          toast({
            variant: "destructive",
            title: "CRITICAL NOISE ALERT",
            description: `Noise levels have been critical for over 10 seconds. Notifying admin: ${alertSettings.adminContact || 'No contact provided'}`,
          });
          setHasNotifiedAdmin(true);
        }
      }
    } else {
      setConsecutiveCriticalStart(null);
      setHasNotifiedAdmin(false);
    }
  }, [sensors, thresholds.critical, isAudioMuted, isNotifMuted, alertSettings, playAlert, isAlertPlayedForCurrentEvent, consecutiveCriticalStart, hasNotifiedAdmin, toast]);

  const getColor = (level: number) => {
    if (level <= thresholds.silent) return "rgba(34, 197, 94, 0.85)"; // green-500
    if (level <= thresholds.warning) return "rgba(249, 115, 22, 0.85)"; // orange-500
    return "rgba(239, 68, 68, 0.85)"; // red-500
  };

  const getGlowColor = (level: number) => {
    if (level <= thresholds.silent) return "rgba(34, 197, 94, 0.5)"; 
    if (level <= thresholds.warning) return "rgba(249, 115, 22, 0.5)"; 
    return "rgba(239, 68, 68, 0.5)"; 
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

  // Drag Handlers
  const handlePointerDown = (e: React.PointerEvent, sensorId: string) => {
    if (!isEditMode) return;
    e.preventDefault();
    setDraggingSensorId(sensorId);
    
    const sensor = sensors.find(s => s.id === sensorId);
    const initialX = sensor?.x ?? DEFAULT_POSITIONS[sensorId]?.x ?? 50;
    const initialY = sensor?.y ?? DEFAULT_POSITIONS[sensorId]?.y ?? 50;
    setDragTempPos({ x: initialX, y: initialY });

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isEditMode || !draggingSensorId || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    
    // Calculate new position as percentage
    let newX = ((e.clientX - rect.left) / rect.width) * 100;
    let newY = ((e.clientY - rect.top) / rect.height) * 100;

    newX = Math.max(0, Math.min(100, newX));
    newY = Math.max(0, Math.min(100, newY));

    setDragTempPos({ x: newX, y: newY });
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    if (!isEditMode || !draggingSensorId || !dragTempPos) return;
    
    const idToSave = draggingSensorId;
    const finalPos = { ...dragTempPos };
    
    setDraggingSensorId(null);
    setDragTempPos(null);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    try {
      await setDoc(doc(db, "sensors", idToSave), { 
        x: finalPos.x, 
        y: finalPos.y 
      }, { merge: true });
      toast({
        title: "Position Saved",
        description: `Updated position for ${idToSave}`,
      });
    } catch (err) {
      console.error("Error saving sensor position:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save sensor position.",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapIcon className="w-8 h-8 text-primary neon-glow" />
          <h1 className="text-3xl font-bold font-headline">Live Noise Heatmap</h1>
        </div>
        
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsEditMode((p) => !p)}
                  className={`transition-colors ${isEditMode ? "border-blue-500 text-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : ""}`}
                >
                  {isEditMode ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isEditMode ? 'Lock Sensors' : 'Edit Mode (Drag Sensors)'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsAudioMuted((p) => !p)}
                  className={!isAudioMuted ? "border-primary text-primary neon-glow" : ""}
                >
                  {isAudioMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isAudioMuted ? 'Unmute Audio Alerts' : 'Mute Audio Alerts'}</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsNotifMuted((p) => !p)}
                  className={!isNotifMuted ? "border-primary text-primary neon-glow" : ""}
                >
                  {isNotifMuted ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isNotifMuted ? 'Enable Notifications' : 'Disable Notifications'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Card className="border-border/50 shadow-lg overflow-hidden bg-background/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle>Room Layout</CardTitle>
          <CardDescription>
            Visualize real-time noise distribution. {isEditMode ? "Drag sensors to position them." : "Toggle Edit Mode to reposition sensors."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full max-w-sm items-center gap-1.5 mb-6">
            <Label htmlFor="floorplan">Floor Plan Image</Label>
            <div className="flex gap-2">
              <Input id="floorplan" type="file" accept="image/*" onChange={handleImageUpload} className="cursor-pointer" />
            </div>
          </div>

          <div 
            ref={containerRef}
            className={`relative w-full aspect-[16/10] bg-muted/20 rounded-xl border-2 border-dashed border-border/50 overflow-hidden group select-none ${isEditMode ? 'cursor-crosshair border-blue-500/50' : ''}`}
          >
            {image ? (
              <img
                src={image}
                alt="Room Layout"
                className="absolute inset-0 w-full h-full object-contain"
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Upload className="w-10 h-10 opacity-20" />
                <p>Upload a room layout image to begin</p>
              </div>
            )}

            {image &&
              sensors.map((sensor) => {
                const isDragging = draggingSensorId === sensor.id;
                
                // Determine position
                let posX = sensor.x ?? DEFAULT_POSITIONS[sensor.id]?.x ?? 50;
                let posY = sensor.y ?? DEFAULT_POSITIONS[sensor.id]?.y ?? 50;
                
                if (isDragging && dragTempPos) {
                  posX = dragTempPos.x;
                  posY = dragTempPos.y;
                }

                const level = sensor.level || 0;
                const color = getColor(level);
                const glow = getGlowColor(level);

                return (
                  <div
                    key={sensor.id}
                    onPointerDown={(e) => handlePointerDown(e, sensor.id)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className={`absolute rounded-full flex flex-col items-center justify-center text-white font-bold z-10 transition-transform ${isEditMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'} ${!isDragging && !isEditMode ? 'duration-500 ease-out hover:scale-110' : ''}`}
                    style={{
                      left: `${posX}%`,
                      top: `${posY}%`,
                      width: 56,
                      height: 56,
                      backgroundColor: color,
                      boxShadow: `0 0 35px 15px ${glow}, inset 0 0 10px rgba(255,255,255,0.3)`,
                      transform: 'translate(-50%, -50%)',
                      border: '2px solid rgba(255,255,255,0.8)',
                      touchAction: 'none' // Prevent scrolling while dragging on mobile
                    }}
                  >
                    <span className="text-[10px] uppercase tracking-wider opacity-90 leading-tight">{sensor.id}</span>
                    <span className="text-lg font-black leading-tight drop-shadow-md">{level}</span>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-md bg-background/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-8 justify-center">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-green-500 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.6)] border border-white/20"></div>
              <span className="text-sm font-medium">Low (&le; {thresholds.silent}dB)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-orange-500 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.6)] border border-white/20"></div>
              <span className="text-sm font-medium">Moderate ({thresholds.silent + 1}-{thresholds.warning}dB)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.6)] border border-white/20"></div>
              <span className="text-sm font-medium">High (&gt; {thresholds.warning}dB)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
