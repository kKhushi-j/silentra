"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bot, Lock } from "lucide-react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = () => {
    const ADMIN_PASSWORD = "silentra@admin";

    if (password === ADMIN_PASSWORD) {
      localStorage.setItem("admin-auth", "true");
      router.push("/settings");
    } else {
      alert("Incorrect password");
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-primary/20 bg-card/40 backdrop-blur-xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-primary/10 border border-primary/20 neon-glow">
              <Lock className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold font-headline">Admin Access</CardTitle>
          <CardDescription>Enter your credentials to manage system configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Enter Admin Password"
              className="h-12 text-lg text-center"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
          <Button 
            onClick={handleLogin} 
            className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20"
          >
            Login
          </Button>
          <Button 
            variant="link" 
            className="w-full text-muted-foreground"
            onClick={() => router.push("/")}
          >
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
