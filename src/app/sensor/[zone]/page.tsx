"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { doc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function SensorPage() {
  const params = useParams();
  const zone = params.zone as string;

  const [running, setRunning] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const intervalRef = useRef<any>(null);

  const startSensor = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      intervalRef.current = setInterval(async () => {
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }

        const average = sum / dataArray.length;
        const level = Math.round(average);

        // Update current status
        await setDoc(
          doc(db, "sensors", zone),
          {
            level: level,
            status: "online",
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        );

        // Log historical data for analytics
        await addDoc(collection(db, "readings"), {
          zone: zone,
          level: level,
          timestamp: serverTimestamp(),
        });
      }, 1000);

      setRunning(true);
    } catch (error) {
      console.error("Mic error:", error);
    }
  };

  const stopSensor = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    await setDoc(
      doc(db, "sensors", zone),
      {
        status: "offline",
        level: 0,
        lastUpdated: serverTimestamp(),
      },
      { merge: true }
    );

    setRunning(false);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-6">
      <h1 className="text-3xl font-bold">Sensor: {zone}</h1>

      {!running ? (
        <button
          onClick={startSensor}
          className="bg-green-600 px-6 py-3 rounded text-white"
        >
          Start Sensor
        </button>
      ) : (
        <button
          onClick={stopSensor}
          className="bg-red-600 px-6 py-3 rounded text-white"
        >
          Stop Sensor
        </button>
      )}
    </div>
  );
}
