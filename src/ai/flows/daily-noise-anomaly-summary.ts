'use server';
/**
 * @fileOverview A Genkit flow that generates a daily summary of noise anomalies and significant events.
 *
 * - dailyNoiseAnomalySummary - A function that handles the generation of the daily noise anomaly summary.
 * - DailyNoiseAnomalySummaryInput - The input type for the dailyNoiseAnomalySummary function.
 * - DailyNoiseAnomalySummaryOutput - The return type for the dailyNoiseAnomalySummary function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const NoiseLogEntrySchema = z.object({
  timestamp: z.string().describe('Timestamp of the noise event (ISO 8601 format).'),
  decibelValue: z.number().describe('Decibel value recorded.'),
  classification: z.enum(['Silent', 'Moderate', 'Warning', 'Critical', 'Emergency']).describe('Classification of the noise level.'),
});

const DailyNoiseAnomalySummaryInputSchema = z.object({
  environmentName: z.string().describe('The name of the environment being monitored (e.g., ICU, Patient Ward, Library).'),
  date: z.string().describe('The date for which the summary is requested (YYYY-MM-DD format).'),
  noiseLogs: z.array(NoiseLogEntrySchema).describe('An array of noise log entries for the specified day and environment.'),
  thresholds: z.object({
    silent: z.number().describe('Decibel threshold for Silent classification.'),
    warning: z.number().describe('Decibel threshold for Warning classification.'),
    critical: z.number().describe('Decibel threshold for Critical classification.'),
  }).describe('Noise level thresholds for different classifications.'),
});
export type DailyNoiseAnomalySummaryInput = z.infer<typeof DailyNoiseAnomalySummaryInputSchema>;

const AnomalyDetailSchema = z.object({
  timestamp: z.string().describe('Timestamp of the anomaly.'),
  decibelValue: z.number().describe('Decibel value at the time of the anomaly.'),
  classification: z.enum(['Warning', 'Critical', 'Emergency']).describe('The classification of the noise anomaly.'),
  details: z.string().describe('A brief description of why this event is considered an anomaly.'),
});

const PeakNoiseEventSchema = z.object({
  timestamp: z.string().describe('Timestamp of the peak noise event.'),
  decibelValue: z.number().describe('The peak decibel value recorded.'),
  classification: z.enum(['Silent', 'Moderate', 'Warning', 'Critical', 'Emergency']).describe('Classification of the peak noise level.'),
});

const DailyNoiseAnomalySummaryOutputSchema = z.object({
  environmentName: z.string().describe('The name of the environment.'),
  date: z.string().describe('The date of the summary.'),
  summary: z.string().describe('An overall summary of noise anomalies and significant events for the day.'),
  anomalies: z.array(AnomalyDetailSchema).describe('A list of detected noise anomalies.'),
  peakNoiseEvents: z.array(PeakNoiseEventSchema).describe('A list of the highest noise events recorded.'),
  insights: z.string().describe('Insights and potential patterns identified from the noise data, along with recommendations.'),
});
export type DailyNoiseAnomalySummaryOutput = z.infer<typeof DailyNoiseAnomalySummaryOutputSchema>;

export async function dailyNoiseAnomalySummary(input: DailyNoiseAnomalySummaryInput): Promise<DailyNoiseAnomalySummaryOutput> {
  return dailyNoiseAnomalySummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dailyNoiseAnomalySummaryPrompt',
  input: { schema: DailyNoiseAnomalySummaryInputSchema },
  output: { schema: DailyNoiseAnomalySummaryOutputSchema },
  prompt: `You are SilentraAI, an advanced AI assistant specializing in environmental noise management.
Your task is to analyze the provided daily noise logs for the environment '{{{environmentName}}}' on '{{{date}}}' and generate a comprehensive summary of noise anomalies and significant events.

Use the following thresholds to classify noise levels:
- Silent: <= {{{thresholds.silent}}} dB
- Warning: > {{{thresholds.warning}}} dB
- Critical: > {{{thresholds.critical}}} dB

Analyze the noiseLogs below and provide:
1.  An overall 'summary' highlighting the general noise profile of the day, any periods of unusually high or low noise, and the overall frequency of critical events.
2.  A detailed list of 'anomalies', focusing on specific instances where noise levels reached 'Warning', 'Critical', or 'Emergency' classifications. For each anomaly, provide the timestamp, decibel value, classification, and a brief explanation of its significance.
3.  A list of 'peakNoiseEvents', identifying the top 3-5 highest noise events of the day, including their timestamp, decibel value, and classification.
4.  'insights' into potential patterns (e.g., specific times of day when noise is highest, correlation with certain activities, or repetitive critical events). Also, provide actionable recommendations to improve noise management strategies based on these patterns.

Noise Logs:
{{#each noiseLogs}}
Timestamp: {{{this.timestamp}}}, Decibel: {{{this.decibelValue}}} dB, Classification: {{{this.classification}}}
{{/each}}
`,
});

const dailyNoiseAnomalySummaryFlow = ai.defineFlow(
  {
    name: 'dailyNoiseAnomalySummaryFlow',
    inputSchema: DailyNoiseAnomalySummaryInputSchema,
    outputSchema: DailyNoiseAnomalySummaryOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate daily noise anomaly summary.');
    }
    return output;
  }
);
