'use server';
/**
 * @fileOverview Explains discrepancies in inventory updates using AI.
 *
 * - explainInventoryDiscrepancy - A function that explains the discrepancy
 * - ExplainInventoryDiscrepancyInput - The input type for the explainInventoryDiscrepancy function.
 * - ExplainInventoryDiscrepancyOutput - The return type for the explainInventoryDiscrepancy function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainInventoryDiscrepancyInputSchema = z.object({
  expectedQuantity: z.number().describe('The expected quantity of the item.'),
  actualQuantity: z.number().describe('The actual quantity of the item.'),
  itemDescription: z.string().describe('A description of the item.'),
  previousInventoryData: z
    .string()
    .describe(
      'Previous inventory data that can be used to infer information about the discrepancy.'
    ),
});
export type ExplainInventoryDiscrepancyInput = z.infer<
  typeof ExplainInventoryDiscrepancyInputSchema
>;

const ExplainInventoryDiscrepancyOutputSchema = z.object({
  explanation: z
    .string()
    .describe(
      'A best-effort explanation for the discrepancy between the expected and actual quantities.'
    ),
});
export type ExplainInventoryDiscrepancyOutput = z.infer<
  typeof ExplainInventoryDiscrepancyOutputSchema
>;

export async function explainInventoryDiscrepancy(
  input: ExplainInventoryDiscrepancyInput
): Promise<ExplainInventoryDiscrepancyOutput> {
  return explainInventoryDiscrepancyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainInventoryDiscrepancyPrompt',
  input: {schema: ExplainInventoryDiscrepancyInputSchema},
  output: {schema: ExplainInventoryDiscrepancyOutputSchema},
  prompt: `You are an expert inventory analyst. Given the following information about an inventory discrepancy, provide a best-effort explanation for the discrepancy.

Item Description: {{{itemDescription}}}
Expected Quantity: {{{expectedQuantity}}}
Actual Quantity: {{{actualQuantity}}}
Previous Inventory Data: {{{previousInventoryData}}}

Explanation:`,
});

const explainInventoryDiscrepancyFlow = ai.defineFlow(
  {
    name: 'explainInventoryDiscrepancyFlow',
    inputSchema: ExplainInventoryDiscrepancyInputSchema,
    outputSchema: ExplainInventoryDiscrepancyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
