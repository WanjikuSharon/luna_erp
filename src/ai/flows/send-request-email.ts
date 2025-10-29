// src/ai/flows/send-request-email.ts
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { notifyAdmins } from './notify-admins'; // Import the other flow

// Define input based on MaterialRequestWithVendor data needed for the email
const SendRequestEmailInputSchema = z.object({
  requestId: z.string().describe("The ID of the newly created request."),
  materialName: z.string().describe("Name of the requested material."),
  quantity: z.number().describe("Quantity requested."),
  requesterName: z.string().describe("Name of the person who made the request."),
  vendorName: z.string().describe("Name of the vendor selected."),
  requestUrl: z.string().optional().describe("A direct link to view the request in the ERP (optional)."),
});

const sendRequestEmailFlow = ai.defineFlow(
  {
    name: 'sendRequestEmail',
    inputSchema: SendRequestEmailInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async requestDetails => {
    console.log('sendRequestEmail flow triggered for request:', requestDetails.requestId);

    // Format the email content
    const subject = `New Material Request Submitted: ${requestDetails.materialName}`;
    const body = `
      <h1>New Material Request</h1>
      <p>A new request for raw materials has been submitted:</p>
      <ul>
        <li><strong>Material:</strong> ${requestDetails.materialName}</li>
        <li><strong>Quantity:</strong> ${requestDetails.quantity}</li>
        <li><strong>Vendor:</strong> ${requestDetails.vendorName}</li>
        <li><strong>Requested By:</strong> ${requestDetails.requesterName}</li>
      </ul>
      ${requestDetails.requestUrl ? `<p><a href="${requestDetails.requestUrl}">View Request Details</a></p>` : ''}
      <p>Please review and approve/reject this request in the Luna ERP system.</p>
    `;

    try {
      // Call the notifyAdmins flow
      const result = await notifyAdmins({ subject, body });
      console.log('notifyAdmins result:', result);
      return { success: result.success };
    } catch (error) {
      console.error('Error calling notifyAdmins flow:', error);
      return { success: false };
    }
  }
);

export async function sendRequestEmail(
  input: z.infer<typeof SendRequestEmailInputSchema>
): Promise<{ success: boolean }> {
  return sendRequestEmailFlow(input);
}
