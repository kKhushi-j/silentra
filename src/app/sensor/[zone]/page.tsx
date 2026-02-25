"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function SensorPage() {
  const params = useParams();
  const zone = params.zone as string;

  const [running, setRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!zone) return;

    if (running) {
      console.log("🟢 Sensor STARTED for zone:", zone);

      intervalRef.current = setInterval(async () => {
        const randomLevel = Math.floor(Math.random() * 100);

        console.log("🔥 Interval running");
        console.log("Attempting write to:", zone);

        try {
          await setDoc(doc(db, "sensors", zone), {
            level: randomLevel,
            status: "online",
            lastUpdated: serverTimestamp(),
          });

          console.log("✅ Write SUCCESS");
        } catch (error) {
          console.error("❌ Write FAILED:", error);
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log("🛑 Interval cleared");
      }
    };
  }, [running, zone]);

  const stopSensor = async () => {
    console.log("🔴 Stopping sensor...");

    try {
      await setDoc(
        doc(db, "sensors", zone),
        {
          status: "offline",
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );

      console.log("✅ Stop write SUCCESS");
    } catch (error) {
      console.error("❌ Stop write FAILED:", error);
    }

    setRunning(false);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-6">
      <h1 className="text-3xl font-bold">Sensor: {zone}</h1>

      {!running ? (
        <button
          onClick={() => setRunning(true)}
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
