'use server';
/**
 * @fileOverview A Genkit flow for predicting the probability of high noise levels.
 *
 * - predictiveNoiseAlerts - A function that predicts the probability of high noise levels.
 * - PredictiveNoiseAlertsInput - The input type for the predictiveNoiseAlerts function.
 * - PredictiveNoiseAlertsOutput - The return type for the predictiveNoiseAlerts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictiveNoiseAlertsInputSchema = z.object({
  lastNoiseValues: z
    .array(z.number())
    .min(1)
    .max(20)
    .describe('An array of the last 20 (or fewer) noise values (decibels).'),
  environmentType: z
    .string()
    .describe(
      'The type of environment (e.g., ICU, Patient Ward, Library) where noise is being monitored.'
    ),
});
export type PredictiveNoiseAlertsInput = z.infer<
  typeof PredictiveNoiseAlertsInputSchema
>;

const PredictiveNoiseAlertsOutputSchema = z.object({
  probability: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'The predicted probability (0-1) of high noise levels within the next five minutes.'
    ),
  explanation: z
    .string()
    .describe(
      'A clear explanation of the prediction and potential contributing factors.'
    ),
});
export type PredictiveNoiseAlertsOutput = z.infer<
  typeof PredictiveNoiseAlertsOutputSchema
>;

export async function predictiveNoiseAlerts(
  input: PredictiveNoiseAlertsInput
): Promise<PredictiveNoiseAlertsOutput> {
  return predictiveNoiseAlertsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictiveNoiseAlertsPrompt',
  input: {schema: PredictiveNoiseAlertsInputSchema},
  output: {schema: PredictiveNoiseAlertsOutputSchema},
  prompt: `You are an AI assistant specialized in predicting noise level trends.

Given the last noise level readings and the environment type, predict the probability (0-1) of high noise levels occurring within the next five minutes and provide a clear explanation for your prediction.

Consider the trend in the provided noise values.

Last Noise Values (decibels): {{{lastNoiseValues}}}
Environment Type: {{{environmentType}}}`,
});

const predictiveNoiseAlertsFlow = ai.defineFlow(
  {
    name: 'predictiveNoiseAlertsFlow',
    inputSchema: PredictiveNoiseAlertsInputSchema,
    outputSchema: PredictiveNoiseAlertsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
