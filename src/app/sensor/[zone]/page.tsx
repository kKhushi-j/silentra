"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function SensorPage() {
  const params = useParams();
  const zone = params.zone as string;

  const [running, setRunning] = useState(false);
  const intervalRef = useRef<any>(null);

  const startSensor = () => {
    if (intervalRef.current) return; // prevent duplicate intervals

    console.log("🟢 Starting sensor:", zone);
    setRunning(true);

    intervalRef.current = setInterval(async () => {
      const randomLevel = Math.floor(Math.random() * 100);

      console.log("🔥 Writing:", randomLevel);

      try {
        await setDoc(doc(db, "sensors", zone), {
          level: randomLevel,
          status: "online",
          lastUpdated: serverTimestamp(),
        });
      } catch (err) {
        console.error("❌ Write error:", err);
      }
    }, 1000);
  };

  const stopSensor = async () => {
    console.log("🔴 Stopping sensor:", zone);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    try {
      await setDoc(
        doc(db, "sensors", zone),
        {
          status: "offline",
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("❌ Stop write error:", err);
    }

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
