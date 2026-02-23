'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

const environments = [
  { id: 'icu', name: 'ICU', thresholds: { silent: 40, warning: 75, critical: 90 } },
  { id: 'patient-ward', name: 'Patient Ward', thresholds: { silent: 35, warning: 65, critical: 80 } },
  { id: 'library', name: 'Library', thresholds: { silent: 30, warning: 50, critical: 65 } },
  { id: 'open-office', name: 'Open Office', thresholds: { silent: 45, warning: 60, critical: 75 } },
];

type Thresholds = {
  silent: number;
  warning: number;
  critical: number;
};

export function SettingsView() {
  const [selectedEnv, setSelectedEnv] = useState(environments[0]);
  const [thresholds, setThresholds] = useState<Thresholds>(selectedEnv.thresholds);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleEnvChange = (envId: string) => {
    const newEnv = environments.find(e => e.id === envId);
    if (newEnv) {
      setSelectedEnv(newEnv);
      setThresholds(newEnv.thresholds);
    }
  };
  
  const handleSliderChange = (key: keyof Thresholds, value: number[]) => {
      setThresholds(prev => ({...prev, [key]: value[0]}));
  }

  const handleSave = () => {
    setIsSaving(true);
    // Simulate saving to Firestore
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Settings Saved",
        description: `Thresholds for ${selectedEnv.name} have been updated.`,
      })
      console.log('Saving to Firestore:', { environment: selectedEnv.id, thresholds });
    }, 1000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adaptive Threshold Management</CardTitle>
        <CardDescription>
          Adjust noise level thresholds for different environments. These settings
          would be saved to Firestore.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="environment-select">Select Environment</Label>
          <Select value={selectedEnv.id} onValueChange={handleEnvChange}>
            <SelectTrigger id="environment-select" className="w-full md:w-1/2">
              <SelectValue placeholder="Select an environment" />
            </SelectTrigger>
            <SelectContent>
              {environments.map(env => (
                <SelectItem key={env.id} value={env.id}>{env.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-6">
            <ThresholdSlider 
                label="Silent Threshold"
                description="Anything below this is 'Silent'."
                value={thresholds.silent}
                onValueChange={(value) => handleSliderChange('silent', value)}
                colorClass="bg-green-500"
            />
             <ThresholdSlider 
                label="Warning Threshold"
                description="Noise levels above this trigger a 'Warning'."
                value={thresholds.warning}
                onValueChange={(value) => handleSliderChange('warning', value)}
                colorClass="bg-yellow-500"
            />
             <ThresholdSlider 
                label="Critical Threshold"
                description="Noise levels above this are 'Critical' or 'Emergency'."
                value={thresholds.critical}
                onValueChange={(value) => handleSliderChange('critical', value)}
                colorClass="bg-red-500"
            />
        </div>

      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardFooter>
    </Card>
  );
}

interface ThresholdSliderProps {
    label: string;
    description: string;
    value: number;
    onValueChange: (value: number[]) => void;
    colorClass: string;
}

function ThresholdSlider({ label, description, value, onValueChange, colorClass }: ThresholdSliderProps) {
    return (
        <div className="space-y-3">
            <div className="flex justify-between items-baseline">
                <div>
                    <Label className="text-base">{label}</Label>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <span className="text-xl font-bold font-headline tabular-nums text-primary w-20 text-right">{value} dB</span>
            </div>
            <Slider
              value={[value]}
              onValueChange={onValueChange}
              max={120}
              step={1}
            />
          </div>
    )
}
