"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SettingsView } from '@/components/dashboard/settings-view';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const isAdmin = localStorage.getItem("admin-auth");
    if (!isAdmin) {
      router.push("/admin-login");
    } else {
      setAuthorized(true);
    }
  }, [router]);

  if (!authorized) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-2">
        <h1 className="text-3xl font-bold font-headline">System Settings</h1>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            localStorage.removeItem("admin-auth");
            window.location.href = "/";
          }}
          className="shadow-lg shadow-destructive/20"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
      <SettingsView />
    </div>
  );
}
