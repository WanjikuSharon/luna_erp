// src/ai/flows/notify-admins.ts
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { initializeFirebase } from '@/firebase/server-init';
import { sendEmail } from '@/services/email_service';
import type { User } from '@/lib/types';
import { COLLECTIONS } from '@/services/inventory_service';

// Define the input schema for this flow
const NotifyAdminsInputSchema = z.object({
  subject: z.string().describe('The subject line of the notification email.'),
  body: z.string().describe('The HTML body content of the notification email.'),
});

const notifyAdminsFlow = ai.defineFlow(
  {
    name: 'notifyAdmins',
    inputSchema: NotifyAdminsInputSchema,
    outputSchema: z.object({ success: z.boolean(), notifiedCount: z.number() }),
  },
  async input => {
    console.log('notifyAdmins flow started with input:', input);
    const { firestore } = initializeFirebase(); // Get Firestore instance
    const recipients: { email_address: { address: string; name?: string } }[] = [];
    let notifiedCount = 0;

    try {
      // 1. Query Firestore for admin users using client SDK
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const usersRef = collection(firestore, COLLECTIONS.USERS);
      const q = query(usersRef, where('role', '==', 'admin'));
      const querySnapshot = await getDocs(q);

      console.log(`Found ${querySnapshot.docs.length} potential admin(s).`);

      querySnapshot.forEach((doc: any) => {
        const adminUser = { id: doc.id, ...doc.data() } as User;
        const settings = adminUser.notificationSettings;

        console.log(`Checking admin: ${adminUser.email}`, settings);

        // 2. Filter based on preferences
        if (settings?.receiveEmails !== false) { // Notify if true or undefined/missing
          recipients.push({
            email_address: {
              address: adminUser.email,
              name: adminUser.name,
            },
          });
          console.log(`Adding ${adminUser.email} to recipients.`);
        } else {
          console.log(`Skipping ${adminUser.email} due to notification preferences.`);
        }
      });

      // 3. Call the email service if there are recipients
      if (recipients.length > 0) {
        console.log(`Attempting to send email to ${recipients.length} admin(s).`);
        const emailSent = await sendEmail({
          to: recipients,
          subject: input.subject,
          htmlbody: input.body,
          from: { address: 'erp-noreply@luna.co.ke', name: 'Luna ERP System' }, // Define a sender
        });

        if (emailSent) {
          notifiedCount = recipients.length;
          console.log(`Email successfully sent to ${notifiedCount} admin(s).`);
          return { success: true, notifiedCount };
        } else {
          console.error('Email service failed to send.');
          return { success: false, notifiedCount: 0 };
        }
      } else {
        console.log('No admins found or eligible for email notification.');
        return { success: true, notifiedCount: 0 }; // Success, but no one notified
      }
    } catch (error) {
      console.error('Error in notifyAdmins flow:', error);
      return { success: false, notifiedCount: 0 };
    }
  }
);

export async function notifyAdmins(
  input: z.infer<typeof NotifyAdminsInputSchema>
): Promise<{ success: boolean; notifiedCount: number }> {
  return notifyAdminsFlow(input);
}
