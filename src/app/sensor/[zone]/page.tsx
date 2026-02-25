"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * @fileOverview A page that captures live audio from the microphone and reports noise levels.
 * 
 * This component uses the Web Audio API to analyze frequency data from the microphone
 * and calculates an average noise level, which is then written to Firestore.
 */

export default function SensorPage() {
  const params = useParams();
  const zone = params.zone as string;

  const [running, setRunning] = useState(false);
  const intervalRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const startSensor = async () => {
    if (intervalRef.current) return;

    try {
      console.log("🟢 Starting live sensor:", zone);
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Initialize Web Audio API components
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      microphone.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      setRunning(true);

      // Start the monitoring loop
      intervalRef.current = setInterval(async () => {
        analyser.getByteFrequencyData(dataArray);

        // Calculate average noise level from frequency data
        const avg =
          dataArray.reduce((sum, value) => sum + value, 0) /
          dataArray.length;

        const level = Math.round(avg);

        console.log("Live noise level:", level);

        try {
          // Update Firestore with the calculated level
          await setDoc(doc(db, "sensors", zone || "Mic_A"), {
            level,
            lastUpdated: new Date(),
            status: "online"
          });
          console.log("✅ Write SUCCESS");
        } catch (err) {
          console.error("❌ Write error:", err);
        }
      }, 1000);
    } catch (err) {
      console.error("❌ Microphone access error:", err);
      alert("Microphone access is required for live monitoring. Please enable permissions in your browser.");
    }
  };

  const stopSensor = async () => {
    console.log("🔴 Stopping sensor:", zone);

    setRunning(false);

    // Clear the interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop microphone tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close Audio Context
    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Mark sensor as offline in Firestore
    try {
      await setDoc(
        doc(db, "sensors", zone || "Mic_A"),
        {
          status: "offline",
          lastUpdated: new Date(),
        },
        { merge: true }
      );
      console.log("✅ Stop write SUCCESS");
    } catch (err) {
      console.error("❌ Stop write error:", err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-6">
      <h1 className="text-3xl font-bold">Live Sensor: {zone || "Mic_A"}</h1>
      <p className="text-muted-foreground text-center max-w-md">
        This page uses your microphone to monitor noise levels in real-time and reports them to the central dashboard.
      </p>

      {!running ? (
        <button
          onClick={startSensor}
          className="bg-green-600 px-8 py-4 rounded-lg text-white font-bold text-lg hover:bg-green-700 transition-all shadow-lg active:scale-95"
        >
          Start Live Sensor
        </button>
      ) : (
        <button
          onClick={stopSensor}
          className="bg-red-600 px-8 py-4 rounded-lg text-white font-bold text-lg hover:bg-red-700 transition-all shadow-lg active:scale-95"
        >
          Stop Live Sensor
        </button>
      )}
      
      {running && (
        <div className="flex items-center gap-2 text-green-500 animate-pulse">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="font-medium">Monitoring Active</span>
        </div>
      )}
    </div>
  );
}