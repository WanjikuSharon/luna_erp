// src/components/data-management/ImportDialog.tsx
'use client';

import { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { generateImportTemplate } from '@/lib/import/excel-import';
import { useToast } from '@/hooks/use-toast';

interface ImportDialogProps {
  type: 'inventory' | 'sales' | 'production';
  onImport: (file: File) => Promise<{
    success: boolean;
    data: any[];
    errors: any[];
  }>;
  onImportComplete?: (data: any[]) => void;
}

export function ImportDialog({ type, onImport, onImportComplete }: ImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        toast({
          title: 'Invalid File',
          description: 'Please select an Excel file (.xlsx or .xls)',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const importResult = await onImport(file);
      
      clearInterval(progressInterval);
      setProgress(100);
      setResult(importResult);

      if (importResult.success) {
        toast({
          title: 'Import Successful',
          description: `${importResult.data.length} records imported successfully`,
        });
        
        if (onImportComplete) {
          onImportComplete(importResult.data);
        }
      } else {
        toast({
          title: 'Import Completed with Errors',
          description: `${importResult.errors.length} errors found`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: 'An error occurred during import',
        variant: 'destructive',
      });
      setResult({ success: false, data: [], errors: [{ message: 'Import failed' }] });
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    generateImportTemplate(type);
    toast({
      title: 'Template Downloaded',
      description: `${type} import template has been downloaded`,
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    setFile(null);
    setResult(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import {type.charAt(0).toUpperCase() + type.slice(1)} Data</DialogTitle>
          <DialogDescription>
            Upload an Excel file to import data. Download the template to see the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template */}
          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertTitle>Need a template?</AlertTitle>
            <AlertDescription>
              Download our Excel template to ensure your data is formatted correctly.
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 ml-2"
                onClick={handleDownloadTemplate}
              >
                <Download className="mr-1 h-3 w-3" />
                Download Template
              </Button>
            </AlertDescription>
          </Alert>

          {/* File Upload */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {file ? file.name : 'Click to select Excel file or drag and drop'}
              </p>
              {file && (
                <Badge variant="secondary" className="mt-2">
                  {(file.size / 1024).toFixed(2)} KB
                </Badge>
              )}
            </label>
          </div>

          {/* Import Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Importing data...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Import Results */}
          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {result.success ? 'Import Successful' : 'Import Failed'}
              </AlertTitle>
              <AlertDescription>
                {result.success ? (
                  <p>{result.data.length} records imported successfully</p>
                ) : (
                  <div>
                    <p className="mb-2">{result.errors.length} errors found:</p>
                    <ScrollArea className="h-32 w-full rounded-md border p-2">
                      {result.errors.map((error: any, index: number) => (
                        <div key={index} className="text-xs mb-1">
                          Row {error.row}: {error.field} - {error.message}
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {result?.success ? 'Done' : 'Cancel'}
          </Button>
          {!result?.success && (
            <Button
              onClick={handleImport}
              disabled={!file || importing}
            >
              {importing ? 'Importing...' : 'Import'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
