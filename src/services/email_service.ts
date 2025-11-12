// src/services/email_service.ts
'use server'; // Mark this module for server-side execution if needed by flows

import { createLogger } from '@/lib/logger';

const logger = createLogger('EmailService');

// Define the structure of the email data
interface SendEmailParams {
  to: { email_address: { address: string; name?: string } }[];
  subject: string;
  htmlbody: string; // ZeptoMail uses htmlbody for HTML content
  from: { address: string; name?: string };
}

// ZeptoMail API endpoint
const ZEPTOMAIL_API_URL = 'https://api.zeptomail.com/v1.1/email';

/**
 * Sends an email using the ZeptoMail API.
 * @param {SendEmailParams} params - Email parameters including recipients, subject, body, and sender.
 * @returns {Promise<boolean>} - True if the email was sent successfully (based on API response), false otherwise.
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.ZEPTOMAIL_API_KEY;

  if (!apiKey) {
    logger.error('ZeptoMail API Key is not configured in environment variables.');
    return false;
  }

  // Ensure the bounce address is set
  const payload = {
    ...params,
    bounce_address: 'delivery@luna.co.ke', // As requested
  };

  try {
    const response = await fetch(ZEPTOMAIL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': apiKey, // API key includes the prefix
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error(`Failed to send email via ZeptoMail. Status: ${response.status}`, errorBody);
      return false;
    }

    const result = await response.json();
    logger.info('ZeptoMail API Response:', result);
    // You might want to check the specific structure of ZeptoMail's success response
    // For now, we assume a 2xx status means success
    return true;

  } catch (error) {
    logger.error('Error sending email:', error);
    return false;
  }
}
