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
import { Save, UserCog, Cloud } from 'lucide-react';
import { Separator } from '../ui/separator';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.environment) {
            const env = environments.find(e => e.id === data.environment);
            if (env) setSelectedEnv(env);
          }
          if (data.thresholds) setThresholds(data.thresholds);
          if (data.alertType) setAlertType(data.alertType);
          if (data.voiceMessage) setVoiceMessage(data.voiceMessage);
          if (data.adminContact) setAdminContact(data.adminContact);
        } else {
          // Fallback to local storage if Firestore has no document
          const savedSettingsRaw = localStorage.getItem('silentra_settings');
          if (savedSettingsRaw) {
            const savedSettings = JSON.parse(savedSettingsRaw);
            if (savedSettings.environment) {
                const env = environments.find(e => e.id === savedSettings.environment);
                if (env) setSelectedEnv(env);
            }
            if(savedSettings.thresholds) setThresholds(savedSettings.thresholds);
            if(savedSettings.alertType) setAlertType(savedSettings.alertType);
            if(savedSettings.voiceMessage) setVoiceMessage(savedSettings.voiceMessage);
            if(savedSettings.adminContact) setAdminContact(savedSettings.adminContact);
          }
        }
      } catch (e) {
        console.error('Could not fetch settings', e);
      }
    };
    fetchSettings();
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

  const handleSave = async () => {
    setIsSaving(true);
    const settings = {
      environment: selectedEnv.id,
      thresholds,
      alertType,
      voiceMessage,
      adminContact
    };
    
    try {
      // Save to local storage for quick local access
      localStorage.setItem('silentra_settings', JSON.stringify(settings));
      
      // Save to Firestore for cloud sync
      await setDoc(doc(db, 'settings', 'global'), settings);
      
      toast({
        title: "Settings Saved",
        description: `Settings for ${selectedEnv.name} have been updated successfully in the cloud.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error Saving Settings",
        description: "There was a problem syncing settings to the cloud.",
      });
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="card border-white/10 overflow-hidden">
      <CardHeader className="bg-white/5 border-b border-white/5 pb-8">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl font-headline tracking-wide text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.3)]">Configuration Settings</CardTitle>
            <CardDescription className="text-base mt-2">
              Adjust noise level thresholds and alert behaviors for different environments.
            </CardDescription>
          </div>
          <Cloud className="w-8 h-8 text-muted-foreground opacity-50" />
        </div>
      </CardHeader>
      <CardContent className="space-y-8 pt-8">
        <div className="space-y-3">
          <Label htmlFor="environment-select" className="text-base font-semibold">Select Environment</Label>
          <Select value={selectedEnv.id} onValueChange={handleEnvChange}>
            <SelectTrigger id="environment-select" className="w-full md:w-1/2 bg-white/5 border-white/10 hover:bg-white/10 transition-colors h-12">
              <SelectValue placeholder="Select an environment" />
            </SelectTrigger>
            <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10">
              {environments.map(env => (
                <SelectItem key={env.id} value={env.id} className="focus:bg-primary/20">{env.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-8 bg-black/20 p-6 rounded-2xl border border-white/5">
            <ThresholdSlider 
                label="Silent Threshold"
                description="Anything below this is considered 'Silent'."
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

        <Separator className="bg-white/10" />

        <div className="space-y-6">
            <div>
              <h3 className="text-xl font-headline font-semibold text-primary">Audio Alert Settings</h3>
              <p className="text-sm text-muted-foreground mt-1">
                  Choose an audio alert to play when noise exceeds the critical threshold.
              </p>
            </div>
            <RadioGroup value={alertType} onValueChange={(value: any) => setAlertType(value)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 bg-white/5 p-4 rounded-xl border border-white/5 hover:border-primary/50 transition-colors">
                    <RadioGroupItem value="none" id="r-none" />
                    <Label htmlFor="r-none" className="font-medium cursor-pointer flex-1">No Sound (Visual Only)</Label>
                </div>
                <div className="flex items-center space-x-3 bg-white/5 p-4 rounded-xl border border-white/5 hover:border-primary/50 transition-colors">
                    <RadioGroupItem value="beep" id="r-beep" />
                    <Label htmlFor="r-beep" className="font-medium cursor-pointer flex-1">Beep Tone</Label>
                </div>
                <div className="flex items-center space-x-3 bg-white/5 p-4 rounded-xl border border-white/5 hover:border-primary/50 transition-colors">
                    <RadioGroupItem value="chime" id="r-chime" />
                    <Label htmlFor="r-chime" className="font-medium cursor-pointer flex-1">Soft Chime</Label>
                </div>
                <div className="flex items-center space-x-3 bg-white/5 p-4 rounded-xl border border-white/5 hover:border-primary/50 transition-colors">
                    <RadioGroupItem value="voice" id="r-voice" />
                    <Label htmlFor="r-voice" className="font-medium cursor-pointer flex-1">Voice Announcement</Label>
                </div>
            </RadioGroup>

            {alertType === 'voice' && (
                <div className="grid w-full gap-3 pt-4 animate-fade-in">
                    <Label htmlFor="voice-message" className="text-base font-semibold">Announcement Message</Label>
                    <Textarea
                        id="voice-message"
                        value={voiceMessage}
                        onChange={(e) => setVoiceMessage(e.target.value)}
                        placeholder="e.g., Attention: Critical noise level detected."
                        className="bg-white/5 border-white/10 focus-visible:ring-primary min-h-[100px]"
                    />
                </div>
            )}
        </div>

        <Separator className="bg-white/10" />

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-full">
              <UserCog className="w-6 h-6 text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" />
            </div>
            <div>
              <h3 className="text-xl font-headline font-semibold text-primary">Admin Notification</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Provide contact info to be notified when noise levels remain critical.
              </p>
            </div>
          </div>
          
          <div className="grid w-full gap-3 bg-white/5 p-6 rounded-2xl border border-white/5">
            <Label htmlFor="admin-contact" className="font-semibold">Contact Info (Email/Phone)</Label>
            <Input 
              id="admin-contact" 
              placeholder="e.g., admin@hospital.com or +1 234 567 890" 
              value={adminContact}
              onChange={(e) => setAdminContact(e.target.value)}
              className="bg-background/50 border-white/10 focus-visible:ring-primary h-12"
            />
          </div>
        </div>

      </CardContent>
      <CardFooter className="bg-white/5 border-t border-white/5 p-6 flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg" className="rounded-full shadow-[0_0_15px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.5)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95 px-8">
            <Save className="mr-2 h-5 w-5" />
            {isSaving ? 'Syncing to Cloud...' : 'Save Settings'}
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
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-background/40 p-4 rounded-xl border border-white/5">
                <div>
                    <Label className="text-base font-semibold">{label}</Label>
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                </div>
                <div className="bg-primary/20 px-4 py-2 rounded-lg border border-primary/30">
                  <span className="text-2xl font-bold font-headline tabular-nums text-primary tracking-wide">{value}</span>
                  <span className="text-sm text-primary/80 ml-1 font-medium">dB</span>
                </div>
            </div>
            <div className="px-2">
              <Slider
                value={[value]}
                onValueChange={onValueChange}
                max={120}
                step={1}
                className="cursor-pointer"
              />
            </div>
          </div>
    )
}
