"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function SensorPage() {
  const params = useParams();
  const zone = params.zone as string;

  const [running, setRunning] = useState(false);

  useEffect(() => {
    let interval: any;

    if (running) {
      interval = setInterval(async () => {
        const randomLevel = Math.floor(Math.random() * 100);

        await setDoc(doc(db, "sensors", zone), {
          level: randomLevel,
          status: "online",
          lastUpdated: serverTimestamp(),
        });
      }, 1000);
    }

    return () => {
      clearInterval(interval);
    };
  }, [running, zone]);

  const stopSensor = async () => {
    await setDoc(doc(db, "sensors", zone), {
      status: "offline",
      lastUpdated: serverTimestamp(),
    }, { merge: true });

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
