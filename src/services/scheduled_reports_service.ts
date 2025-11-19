// src/services/scheduled_reports_service.ts
import { 
  collection, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  Timestamp,
  Firestore
} from 'firebase/firestore';

export interface ScheduledReport {
  id: string;
  name: string;
  description?: string;
  reportType: 'sales' | 'inventory' | 'production' | 'operations' | 'activity';
  schedule: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipients: string[]; // Email addresses
  fields: string[];
  exportFormat: 'excel' | 'pdf' | 'csv';
  isActive: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  lastRun?: Timestamp;
  nextRun?: Timestamp;
  includeDateRange: boolean;
  customFilters?: Record<string, any>;
}

const COLLECTION_NAME = 'scheduled_reports';

// Calculate next run date based on schedule
export function calculateNextRun(schedule: ScheduledReport['schedule'], fromDate: Date = new Date()): Date {
  const nextRun = new Date(fromDate);
  
  switch (schedule) {
    case 'daily':
      nextRun.setDate(nextRun.getDate() + 1);
      break;
    case 'weekly':
      nextRun.setDate(nextRun.getDate() + 7);
      break;
    case 'monthly':
      nextRun.setMonth(nextRun.getMonth() + 1);
      break;
    case 'quarterly':
      nextRun.setMonth(nextRun.getMonth() + 3);
      break;
  }
  
  // Set to 9 AM on the scheduled day
  nextRun.setHours(9, 0, 0, 0);
  return nextRun;
}

// Create a new scheduled report
export async function createScheduledReport(
  firestore: Firestore,
  report: Omit<ScheduledReport, 'id' | 'createdAt' | 'lastRun' | 'nextRun'>
): Promise<string> {
  try {
    const nextRun = calculateNextRun(report.schedule);
    
    const docRef = await addDoc(collection(firestore, COLLECTION_NAME), {
      ...report,
      createdAt: Timestamp.now(),
      nextRun: Timestamp.fromDate(nextRun),
    });
    
    console.log('Scheduled report created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating scheduled report:', error);
    throw error;
  }
}

// Update scheduled report
export async function updateScheduledReport(
  firestore: Firestore,
  reportId: string,
  updates: Partial<Omit<ScheduledReport, 'id' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  try {
    const reportRef = doc(firestore, COLLECTION_NAME, reportId);
    
    // If schedule changed, recalculate next run
    const updateData: any = { ...updates };
    if (updates.schedule) {
      updateData.nextRun = Timestamp.fromDate(calculateNextRun(updates.schedule));
    }
    
    await updateDoc(reportRef, updateData);
    console.log('Scheduled report updated:', reportId);
  } catch (error) {
    console.error('Error updating scheduled report:', error);
    throw error;
  }
}

// Delete scheduled report
export async function deleteScheduledReport(
  firestore: Firestore,
  reportId: string
): Promise<void> {
  try {
    const reportRef = doc(firestore, COLLECTION_NAME, reportId);
    await deleteDoc(reportRef);
    console.log('Scheduled report deleted:', reportId);
  } catch (error) {
    console.error('Error deleting scheduled report:', error);
    throw error;
  }
}

// Get all scheduled reports
export async function getScheduledReports(firestore: Firestore): Promise<ScheduledReport[]> {
  try {
    const snapshot = await getDocs(collection(firestore, COLLECTION_NAME));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduledReport));
  } catch (error) {
    console.error('Error fetching scheduled reports:', error);
    throw error;
  }
}

// Get reports that need to run
export async function getReportsDueForExecution(firestore: Firestore): Promise<ScheduledReport[]> {
  try {
    const now = Timestamp.now();
    const q = query(
      collection(firestore, COLLECTION_NAME),
      where('isActive', '==', true),
      where('nextRun', '<=', now)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduledReport));
  } catch (error) {
    console.error('Error fetching reports due for execution:', error);
    throw error;
  }
}

// Mark report as executed and schedule next run
export async function markReportExecuted(
  firestore: Firestore,
  reportId: string,
  schedule: ScheduledReport['schedule']
): Promise<void> {
  try {
    const reportRef = doc(firestore, COLLECTION_NAME, reportId);
    const now = new Date();
    const nextRun = calculateNextRun(schedule, now);
    
    await updateDoc(reportRef, {
      lastRun: Timestamp.fromDate(now),
      nextRun: Timestamp.fromDate(nextRun),
    });
    
    console.log('Report marked as executed:', reportId);
  } catch (error) {
    console.error('Error marking report as executed:', error);
    throw error;
  }
}

// Toggle report active status
export async function toggleReportStatus(
  firestore: Firestore,
  reportId: string,
  isActive: boolean
): Promise<void> {
  try {
    const reportRef = doc(firestore, COLLECTION_NAME, reportId);
    await updateDoc(reportRef, { isActive });
    console.log(`Report ${isActive ? 'activated' : 'deactivated'}:`, reportId);
  } catch (error) {
    console.error('Error toggling report status:', error);
    throw error;
  }
}

// Get schedule description
export function getScheduleDescription(schedule: ScheduledReport['schedule']): string {
  const descriptions = {
    daily: 'Every day at 9:00 AM',
    weekly: 'Every Monday at 9:00 AM',
    monthly: 'First day of each month at 9:00 AM',
    quarterly: 'First day of each quarter at 9:00 AM',
  };
  return descriptions[schedule];
}
