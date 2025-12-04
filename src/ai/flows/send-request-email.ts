// src/ai/flows/send-request-email.ts
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { createLogger } from '@/lib/logger';
import { notifyAdmins } from './notify-admins'; // Import the other flow

const logger = createLogger('ai-send-request-email');

// Define input based on MaterialRequestWithVendor data needed for the email
const SendRequestEmailInputSchema = z.object({
  requestId: z.string().describe("The ID of the newly created request."),
  materialName: z.string().describe("Name of the requested material."),
  quantity: z.number().describe("Quantity requested."),
  requesterName: z.string().describe("Name of the person who made the request."),
  vendorName: z.string().describe("Name of the vendor selected."),
  vendorEmail: z.string().describe("Email address of the vendor."),
  requestUrl: z.string().optional().describe("A direct link to view the request in the ERP (optional)."),
});

const sendRequestEmailFlow = ai.defineFlow(
  {
    name: 'sendRequestEmail',
    inputSchema: SendRequestEmailInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async requestDetails => {
    logger.debug('sendRequestEmail flow triggered for request:', requestDetails.requestId);

    // Format the email content for the vendor
    const subject = `Material Request from Luna Industries: ${requestDetails.materialName}`;
    const body = `
      <h1>Material Request</h1>
      <p>Dear ${requestDetails.vendorName},</p>
      <p>We would like to place an order for the following material:</p>
      <ul>
        <li><strong>Material:</strong> ${requestDetails.materialName}</li>
        <li><strong>Quantity:</strong> ${requestDetails.quantity}</li>
        <li><strong>Request ID:</strong> ${requestDetails.requestId}</li>
      </ul>
      <p>Please confirm availability and delivery timeline at your earliest convenience.</p>
      <p>Best regards,<br>
      ${requestDetails.requesterName}<br>
      Luna Industries</p>
    `;

    try {
      // Import and use the sendEmail function directly to send to vendor
      const { sendEmail } = await import('@/services/email_service');
      
      const result = await sendEmail({
        to: [{
          email_address: {
            address: requestDetails.vendorEmail,
            name: requestDetails.vendorName
          }
        }],
        subject,
        htmlbody: body
      });
      
      logger.info(`Email sent to vendor ${requestDetails.vendorName} (${requestDetails.vendorEmail}):`, result);
      return { success: result };
    } catch (error) {
      logger.error('Error sending email to vendor:', error);
      return { success: false };
    }
  }
);

export async function sendRequestEmail(
  input: z.infer<typeof SendRequestEmailInputSchema>
): Promise<{ success: boolean }> {
  return sendRequestEmailFlow(input);
}
