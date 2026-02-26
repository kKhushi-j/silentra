'use client';

import { useState, useEffect } from 'react';
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
import { Save, UserCog } from 'lucide-react';
import { Separator } from '../ui/separator';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';

const environments = [
  { id: 'icu', name: 'ICU', thresholds: { silent: 40, warning: 75, critical: 90 } },
  { id: 'patient-ward', name: 'Patient Ward', thresholds: { silent: 35, warning: 65, critical: 80 } },
  { id: 'hospital-general', name: 'Hospital (General)', thresholds: { silent: 40, warning: 70, critical: 85 } },
  { id: 'library', name: 'Library', thresholds: { silent: 30, warning: 50, critical: 65 } },
  { id: 'museum', name: 'Museum', thresholds: { silent: 35, warning: 55, critical: 70 } },
  { id: 'temple', name: 'Temple / Place of Worship', thresholds: { silent: 30, warning: 45, critical: 60 } },
  { id: 'court-room', name: 'Court Room', thresholds: { silent: 35, warning: 50, critical: 65 } },
  { id: 'open-office', name: 'Open Office', thresholds: { silent: 45, warning: 60, critical: 75 } },
];

type Thresholds = {
  silent: number;
  warning: number;
  critical: number;
};

type AlertType = 'none' | 'chime' | 'beep' | 'voice';

export function SettingsView() {
  const [selectedEnv, setSelectedEnv] = useState(environments[0]);
  const [thresholds, setThresholds] = useState<Thresholds>(selectedEnv.thresholds);
  const [alertType, setAlertType] = useState<AlertType>('none');
  const [voiceMessage, setVoiceMessage] = useState('Attention: Noise levels are critical.');
  const [adminContact, setAdminContact] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    try {
      const savedSettingsRaw = localStorage.getItem('silentra_settings');
      if (savedSettingsRaw) {
          const savedSettings = JSON.parse(savedSettingsRaw);
          if (savedSettings.environment) {
              const env = environments.find(e => e.id === savedSettings.environment);
              if (env) {
                  setSelectedEnv(env);
              }
          }
          if(savedSettings.thresholds) {
              setThresholds(savedSettings.thresholds);
          }
          if(savedSettings.alertType) {
              setAlertType(savedSettings.alertType);
          }
          if(savedSettings.voiceMessage) {
              setVoiceMessage(savedSettings.voiceMessage);
          }
          if(savedSettings.adminContact) {
              setAdminContact(savedSettings.adminContact);
          }
      }
    } catch (e) {
      console.error('Could not parse settings from localStorage', e);
    }
  }, []);

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
    setTimeout(() => {
      setIsSaving(false);
      const settings = {
        environment: selectedEnv.id,
        thresholds,
        alertType,
        voiceMessage,
        adminContact
      };
      localStorage.setItem('silentra_settings', JSON.stringify(settings));
      toast({
        title: "Settings Saved",
        description: `Settings for ${selectedEnv.name} have been updated.`,
      })
    }, 1000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration Settings</CardTitle>
        <CardDescription>
          Adjust noise level thresholds and alert behaviors for different environments.
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
            />
             <ThresholdSlider 
                label="Warning Threshold"
                description="Noise levels above this trigger a 'Warning'."
                value={thresholds.warning}
                onValueChange={(value) => handleSliderChange('warning', value)}
            />
             <ThresholdSlider 
                label="Critical Threshold"
                description="Noise levels above this are 'Critical' or 'Emergency'."
                value={thresholds.critical}
                onValueChange={(value) => handleSliderChange('critical', value)}
            />
        </div>

        <Separator />

        <div className="space-y-4">
            <h3 className="text-lg font-medium">Audio Alert Settings</h3>
            <p className="text-sm text-muted-foreground">
                Choose an audio alert to play when noise exceeds the critical threshold.
            </p>
            <RadioGroup value={alertType} onValueChange={(value: any) => setAlertType(value)} className="space-y-2">
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="r-none" />
                    <Label htmlFor="r-none">No Sound (Visual Only)</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="beep" id="r-beep" />
                    <Label htmlFor="r-beep">Beep Tone</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="chime" id="r-chime" />
                    <Label htmlFor="r-chime">Soft Chime</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="voice" id="r-voice" />
                    <Label htmlFor="r-voice">Voice Announcement</Label>
                </div>
            </RadioGroup>

            {alertType === 'voice' && (
                <div className="grid w-full gap-2 pt-2">
                    <Label htmlFor="voice-message" className="pl-1">Announcement Message</Label>
                    <Textarea
                        id="voice-message"
                        value={voiceMessage}
                        onChange={(e) => setVoiceMessage(e.target.value)}
                        placeholder="e.g., Attention: Critical noise level detected."
                    />
                </div>
            )}
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-medium">Admin Notification Settings</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Provide contact info to be notified when noise levels remain critical for more than 10 seconds.
          </p>
          <div className="grid w-full gap-2">
            <Label htmlFor="admin-contact">Admin Contact Info (Email/Phone)</Label>
            <Input 
              id="admin-contact" 
              placeholder="e.g., admin@hospital.com or +1 234 567 890" 
              value={adminContact}
              onChange={(e) => setAdminContact(e.target.value)}
            />
          </div>
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
}

function ThresholdSlider({ label, description, value, onValueChange }: ThresholdSliderProps) {
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
