// src/services/email_service.ts
'use server';

import nodemailer from 'nodemailer';
import { createLogger } from '@/lib/logger';
import { env } from '@/lib/env';

const logger = createLogger('EmailService');

/**
 * Configure HostPinnacle SMTP Transporter
 */
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465, // TRUE for port 465 (SSL), FALSE for 587 (TLS)
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
  },
});

// Define the structure of the email data (keeping compatibility with existing code)
interface SendEmailParams {
  to: { email_address: { address: string; name?: string } }[];
  subject: string;
  htmlbody: string;
  from?: { address: string; name?: string };
}

/**
 * Sends an email using HostPinnacle SMTP.
 * @param {SendEmailParams} params - Email parameters including recipients, subject, body, and sender.
 * @returns {Promise<boolean>} - True if the email was sent successfully, false otherwise.
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  try {
    // Convert recipients array to comma-separated string
    const recipients = params.to.map(r => 
      r.email_address.name 
        ? `"${r.email_address.name}" <${r.email_address.address}>`
        : r.email_address.address
    ).join(', ');

    const info = await transporter.sendMail({
      from: env.SMTP_FROM,
      to: recipients,
      subject: params.subject,
      html: params.htmlbody,
      text: params.htmlbody.replace(/<[^>]*>?/gm, ''), // Auto-generate plain text from HTML
    });

    logger.info(`📧 Email sent successfully to ${recipients} (ID: ${info.messageId})`);
    return true;
  } catch (error: any) {
    logger.error('❌ Failed to send email via SMTP:', error);
    return false;
  }
}

/**
 * Verify SMTP connection on startup (optional - for testing)
 */
export async function verifyConnection() {
  try {
    await transporter.verify();
    logger.info(`✅ Connected to SMTP Server: ${env.SMTP_HOST}:${env.SMTP_PORT}`);
    return true;
  } catch (error) {
    logger.error('❌ SMTP Connection failed:', error);
    return false;
  }
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
