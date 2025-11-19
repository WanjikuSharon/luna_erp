// src/components/admin/BackupManagementCard.tsx
'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { useUser } from '@/firebase';
import {
  Download,
  Upload,
  Database,
  HardDrive,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  createBackup,
  downloadBackup,
  exportCollectionToCSV,
  downloadCSV,
  formatBackupSize,
  parseBackupFile,
  BACKUP_COLLECTIONS,
  type BackupData,
} from '@/services/backup_service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

export function BackupManagementCard() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [lastBackup, setLastBackup] = useState<BackupData | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  const handleCreateBackup = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to create backups',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingBackup(true);
    setBackupProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setBackupProgress((prev) => Math.min(prev + 10, 90));
      }, 300);

      const backup = await createBackup(
        firestore,
        user.uid,
        user.displayName || user.email || 'Admin'
      );

      clearInterval(progressInterval);
      setBackupProgress(100);
      setLastBackup(backup);

      // Auto-download backup
      downloadBackup(backup);

      toast({
        title: 'Backup Created',
        description: `Successfully backed up ${backup.metadata.totalDocuments} documents (${formatBackupSize(backup.metadata.backupSize)})`,
      });
    } catch (error) {
      toast({
        title: 'Backup Failed',
        description: error instanceof Error ? error.message : 'Failed to create backup',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingBackup(false);
      setTimeout(() => setBackupProgress(0), 2000);
    }
  };

  const handleExportCollection = async () => {
    if (!selectedCollection) return;

    setIsExporting(true);

    try {
      const csv = await exportCollectionToCSV(firestore, selectedCollection);
      
      if (csv) {
        downloadCSV(csv, `${selectedCollection}-${new Date().toISOString().split('T')[0]}.csv`);
        
        toast({
          title: 'Export Successful',
          description: `${selectedCollection} exported to CSV`,
        });
      } else {
        toast({
          title: 'No Data',
          description: `Collection ${selectedCollection} is empty`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export collection',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
      setShowExportDialog(false);
      setSelectedCollection('');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const backup = await parseBackupFile(file);
      
      toast({
        title: 'Backup File Loaded',
        description: `Found ${backup.metadata.totalDocuments} documents from ${backup.metadata.collections.length} collections`,
      });

      // Here you could implement restoration logic
      setLastBackup(backup);
    } catch (error) {
      toast({
        title: 'Invalid Backup File',
        description: error instanceof Error ? error.message : 'Failed to parse backup file',
        variant: 'destructive',
      });
    }

    // Reset input
    event.target.value = '';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Data Backup & Export</CardTitle>
              <CardDescription>
                Create backups and export collections to CSV
              </CardDescription>
            </div>
            <Database className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Backup Progress */}
          {isCreatingBackup && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Creating backup...</span>
                <span>{backupProgress}%</span>
              </div>
              <Progress value={backupProgress} />
            </div>
          )}

          {/* Last Backup Info */}
          {lastBackup && !isCreatingBackup && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Last Backup Created
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">Documents:</span> {lastBackup.metadata.totalDocuments}
                </div>
                <div>
                  <span className="font-medium">Size:</span> {formatBackupSize(lastBackup.metadata.backupSize)}
                </div>
                <div>
                  <span className="font-medium">Collections:</span> {lastBackup.metadata.collections.length}
                </div>
                <div>
                  <span className="font-medium">By:</span> {lastBackup.metadata.createdBy}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              onClick={handleCreateBackup}
              disabled={isCreatingBackup}
              className="w-full"
            >
              {isCreatingBackup ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Create Backup
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowExportDialog(true)}
              className="w-full"
            >
              <HardDrive className="mr-2 h-4 w-4" />
              Export Collection
            </Button>

            <Button
              variant="outline"
              onClick={() => document.getElementById('backup-upload')?.click()}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              Load Backup
            </Button>
          </div>

          {/* Hidden file input */}
          <input
            id="backup-upload"
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Backups include all collections and are downloaded as JSON files
            </p>
            <p>• Backups are automatically downloaded to your device</p>
            <p>• Store backups securely in a safe location</p>
            <p>• Regular backups are recommended before major changes</p>
          </div>
        </CardContent>
      </Card>

      {/* Export Collection Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Collection to CSV</DialogTitle>
            <DialogDescription>
              Select a collection to export as CSV file
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Collection</Label>
              <ScrollArea className="h-[200px] rounded-md border p-2">
                <div className="space-y-1">
                  {BACKUP_COLLECTIONS.map((collection) => (
                    <button
                      key={collection}
                      onClick={() => setSelectedCollection(collection)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedCollection === collection
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {collection}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {selectedCollection && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">
                  <span className="font-medium">Selected:</span> {selectedCollection}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowExportDialog(false);
                setSelectedCollection('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExportCollection}
              disabled={!selectedCollection || isExporting}
            >
              {isExporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Export to CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
