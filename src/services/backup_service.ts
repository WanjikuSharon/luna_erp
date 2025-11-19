// src/services/backup_service.ts
import { collection, getDocs, Firestore, addDoc, serverTimestamp } from 'firebase/firestore';
import { createLogger } from '@/lib/logger';

const logger = createLogger('BackupService');

export interface BackupMetadata {
  id?: string;
  timestamp: any; // Firestore Timestamp
  collections: string[];
  totalDocuments: number;
  backupSize: number; // in bytes
  createdBy: string;
  status: 'completed' | 'failed' | 'in-progress';
  error?: string;
}

export interface BackupData {
  metadata: BackupMetadata;
  data: Record<string, any[]>; // collectionName -> documents
}

/**
 * Collections to backup
 */
export const BACKUP_COLLECTIONS = [
  'users',
  'raw_materials',
  'vendors',
  'material_requests',
  'products',
  'production_batches',
  'daily_sales_records',
  'daily_sales_ledger',
  'van_stock_logs',
  'operations_activities',
  'production_activities',
  'sales_activities',
  'admin_activities',
  'security_events',
];

/**
 * Create a backup of all Firestore collections
 */
export async function createBackup(
  firestore: Firestore,
  userId: string,
  userName: string,
  collectionsToBackup: string[] = BACKUP_COLLECTIONS
): Promise<BackupData> {
  logger.info('Starting backup process...');
  
  const backupData: Record<string, any[]> = {};
  let totalDocuments = 0;
  let totalSize = 0;

  try {
    // Fetch data from each collection
    for (const collectionName of collectionsToBackup) {
      try {
        const collectionRef = collection(firestore, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        const documents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        backupData[collectionName] = documents;
        totalDocuments += documents.length;
        
        // Estimate size (rough calculation)
        totalSize += JSON.stringify(documents).length;
        
        logger.debug(`Backed up ${documents.length} documents from ${collectionName}`);
      } catch (error) {
        logger.error(`Failed to backup collection ${collectionName}:`, error);
        // Continue with other collections
      }
    }

    const metadata: BackupMetadata = {
      timestamp: new Date().toISOString(),
      collections: collectionsToBackup,
      totalDocuments,
      backupSize: totalSize,
      createdBy: userName,
      status: 'completed',
    };

    // Save backup metadata to Firestore
    await addDoc(collection(firestore, 'backup_metadata'), {
      ...metadata,
      timestamp: serverTimestamp(),
    });

    logger.info(`Backup completed: ${totalDocuments} documents, ${(totalSize / 1024).toFixed(2)} KB`);

    return {
      metadata,
      data: backupData,
    };
  } catch (error) {
    logger.error('Backup failed:', error);
    throw error;
  }
}

/**
 * Download backup as JSON file
 */
export function downloadBackup(backup: BackupData, filename?: string): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `luna-erp-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
  
  logger.info(`Backup downloaded: ${link.download}`);
}

/**
 * Export specific collections to CSV
 */
export async function exportCollectionToCSV(
  firestore: Firestore,
  collectionName: string
): Promise<string> {
  try {
    const collectionRef = collection(firestore, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    if (snapshot.empty) {
      return '';
    }

    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get all unique keys
    const keys = new Set<string>();
    documents.forEach(doc => {
      Object.keys(doc).forEach(key => keys.add(key));
    });

    // Create CSV header
    const header = Array.from(keys).join(',');
    
    // Create CSV rows
    const rows = documents.map(doc => {
      return Array.from(keys)
        .map(key => {
          const value = doc[key];
          // Handle different data types
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
          return value;
        })
        .join(',');
    });

    return [header, ...rows].join('\n');
  } catch (error) {
    logger.error(`Failed to export ${collectionName} to CSV:`, error);
    throw error;
  }
}

/**
 * Download collection as CSV
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Get backup size in human-readable format
 */
export function formatBackupSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate backup data structure
 */
export function validateBackupData(data: any): data is BackupData {
  return (
    data &&
    typeof data === 'object' &&
    'metadata' in data &&
    'data' in data &&
    typeof data.metadata === 'object' &&
    typeof data.data === 'object'
  );
}

/**
 * Parse uploaded backup file
 */
export async function parseBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        if (!validateBackupData(json)) {
          throw new Error('Invalid backup file format');
        }
        
        resolve(json);
      } catch (error) {
        reject(new Error('Failed to parse backup file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read backup file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Get backup metadata history
 */
export interface BackupHistory {
  id: string;
  timestamp: any;
  totalDocuments: number;
  backupSize: number;
  createdBy: string;
  status: string;
}
