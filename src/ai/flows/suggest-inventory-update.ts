'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting inventory updates based on discrepancies and historical data.
 *
 * - suggestInventoryUpdate - A function that suggests inventory updates based on input discrepancies and historical data.
 * - SuggestInventoryUpdateInput - The input type for the suggestInventoryUpdate function.
 * - SuggestInventoryUpdateOutput - The return type for the suggestInventoryUpdate function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestInventoryUpdateInputSchema = z.object({
  rawMaterial: z.string().describe('The name of the raw material.'),
  reportedQuantityUsed: z
    .number()
    .describe('The quantity of the raw material reported as used in production.'),
  expectedQuantityUsed: z
    .number()
    .describe('The quantity of the raw material expected to be used based on production output.'),
  historicalUsageData: z
    .string()
    .describe(
      'Historical data on raw material usage, including dates, quantities used, and production output.'
    ),
});
export type SuggestInventoryUpdateInput = z.infer<
  typeof SuggestInventoryUpdateInputSchema
>;

const SuggestInventoryUpdateOutputSchema = z.object({
  suggestedUpdatedQuantity: z
    .number()
    .describe('The suggested updated quantity of the raw material in inventory.'),
  explanation: z
    .string()
    .describe(
      'A proposed explanation for the discrepancy between reported and expected usage.'
    ),
});
export type SuggestInventoryUpdateOutput = z.infer<
  typeof SuggestInventoryUpdateOutputSchema
>;

export async function suggestInventoryUpdate(
  input: SuggestInventoryUpdateInput
): Promise<SuggestInventoryUpdateOutput> {
  return suggestInventoryUpdateFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestInventoryUpdatePrompt',
  input: {schema: SuggestInventoryUpdateInputSchema},
  output: {schema: SuggestInventoryUpdateOutputSchema},
  prompt: `You are an expert inventory analyst. Given the following information about a raw material discrepancy, suggest an updated quantity and an explanation.

Raw Material: {{{rawMaterial}}}
Reported Quantity Used: {{{reportedQuantityUsed}}}
Expected Quantity Used: {{{expectedQuantityUsed}}}
Historical Usage Data: {{{historicalUsageData}}}

Based on this information, suggest a corrected quantity for the raw material in inventory and provide a concise explanation for the discrepancy.  Consider historical usage patterns when forming your explanation.

Make sure to output the data in the format specified by the output schema, including a suggestedUpdatedQuantity and explanation.`,
});

const suggestInventoryUpdateFlow = ai.defineFlow(
  {
    name: 'suggestInventoryUpdateFlow',
    inputSchema: SuggestInventoryUpdateInputSchema,
    outputSchema: SuggestInventoryUpdateOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
