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
import { Button } from '@/components/ui/button';
import { predictiveNoiseAlerts } from '@/ai/flows/predictive-noise-alerts';
import type { PredictiveNoiseAlertsOutput } from '@/ai/flows/predictive-noise-alerts';
import { BrainCircuit, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '../ui/progress';

type PredictiveAlertProps = {
  lastNoiseValues: number[];
};

export function PredictiveAlert({ lastNoiseValues }: PredictiveAlertProps) {
  const [prediction, setPrediction] =
    useState<PredictiveNoiseAlertsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePredict = async () => {
    if (lastNoiseValues.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Not enough data',
        description: 'Waiting for noise data to make a prediction.',
      });
      return;
    }
    setIsLoading(true);
    setPrediction(null);
    try {
      const result = await predictiveNoiseAlerts({
        lastNoiseValues,
        environmentType: 'ICU',
      });
      setPrediction(result);
    } catch (error) {
      console.error('Prediction failed:', error);
      toast({
        variant: 'destructive',
        title: 'Prediction Error',
        description: 'Could not get a prediction from the AI. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const probabilityPercent = prediction ? prediction.probability * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BrainCircuit className="w-5 h-5 text-accent neon-glow-accent" />
          SilentraAI Predictive Alert
        </CardTitle>
        <CardDescription>
          Predicts the chance of high noise levels in the next 5 minutes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && prediction && (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-medium">Probability</span>
                <span className="text-2xl font-bold font-headline text-primary neon-glow">
                  {probabilityPercent.toFixed(0)}%
                </span>
              </div>
              <Progress value={probabilityPercent} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Explanation:</strong>{' '}
              {prediction.explanation}
            </p>
          </div>
        )}

        {!isLoading && !prediction && (
          <div className="text-center text-sm text-muted-foreground h-24 flex items-center justify-center">
            Click "Analyze Trend" to get an AI-powered prediction.
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handlePredict} disabled={isLoading} className="w-full">
          {isLoading ? 'Analyzing...' : 'Analyze Trend'}
        </Button>
      </CardFooter>
    </Card>
  );
}
