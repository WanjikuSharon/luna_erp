// src/components/operations/VerifyDeliveryDialog.tsx
'use client';

import { useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { COLLECTIONS } from '@/services/inventory_service';
import type { MaterialRequest } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormItem, FormMessage } from '@/components/ui/form'; // Using simple form components
import { Loader2, UploadCloud } from 'lucide-react';

// Import your Genkit flow
import { generateUploadSignature } from '@/ai/flows/generate-upload-signature';
import { createLogger } from '@/lib/logger';

const logger = createLogger('VerifyDeliveryDialog');

interface VerifyDeliveryDialogProps {
  request: MaterialRequest | null;
  onOpenChange: (open: boolean) => void;
}

export function VerifyDeliveryDialog({ request, onOpenChange }: VerifyDeliveryDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // UPDATED: Get the user
  const { user: authUser } = useUser();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setErrorMessage(null); // Clear previous errors
      
      // Validation (as per senior dev plan)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

      if (file.size > MAX_FILE_SIZE) {
        setErrorMessage('File is too large (max 10MB).');
        setSelectedFile(null);
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        setErrorMessage('Invalid file type (must be JPG, PNG, or PDF).');
        setSelectedFile(null);
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile || !request) {
      setErrorMessage('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      // 1. Get the secure signature from our Genkit flow
      logger.debug('Requesting upload signature...');
      
      let sigResponse;
      try {
        sigResponse = await generateUploadSignature({});
      } catch (flowError: any) {
        logger.error('Upload signature generation failed:', flowError);
        throw new Error(`Signature generation failed: ${flowError.message || 'Unknown error'}`);
      }
      
      if (!sigResponse) {
        throw new Error('Failed to get upload signature - no response received.');
      }
      
      logger.debug('Signature received:', { 
        cloud_name: sigResponse.cloud_name, 
        timestamp: sigResponse.timestamp 
      });

      // 2. Create FormData and upload to Cloudinary
      logger.debug('Uploading file to Cloudinary...');
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('api_key', sigResponse.api_key);
      formData.append('timestamp', sigResponse.timestamp.toString());
      formData.append('signature', sigResponse.signature);
      // Optional: Add a folder for organization
      // formData.append('folder', 'delivery_notes'); 

      const uploadUrl = `https://api.cloudinary.com/v1_1/${sigResponse.cloud_name}/image/upload`;
      
      logger.debug('Uploading to URL:', uploadUrl);
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        logger.error('Cloudinary upload failed:', errorText);
        throw new Error(`Cloudinary upload failed: ${uploadResponse.status} ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      const secureUrl = uploadResult.secure_url;
      logger.info('File uploaded successfully:', secureUrl);

      // 3. Update the Firestore document - set to pending QC
      logger.debug('Updating Firestore document...');
      const requestDocRef = doc(firestore, COLLECTIONS.REQUESTS, request.id);
      
      await updateDoc(requestDocRef, {
        status: 'pending_qc', // Set to pending QC instead of delivered
        deliveryNoteUrl: secureUrl, // Save the new image URL
        updatedAt: serverTimestamp(),
      });

      // NOTE: Stock will NOT be updated here anymore
      // Production will perform QC and approve before stock is increased

      // Success!
      toast({
        title: 'Delivery Verified!',
        description: 'Delivery note uploaded. Awaiting Production QC approval.',
      });

      // UPDATED: Log this action
      try {
        if (!authUser) {
          logger.warn("Cannot log activity: User not authenticated");
        } else {
          const userName = authUser.displayName || authUser.email || 'Operations User';
          const userAvatar = authUser.photoURL || '';

          await addDoc(collection(firestore, 'operations_activities'), {
            action: `verified delivery for request ID ${request.id}.`,
            user: { name: userName, avatarUrl: userAvatar },
            timestamp: serverTimestamp(),
          });
        }
      } catch (logError) {
        logger.error("Failed to log activity:", logError);
      }

      handleClose();

    } catch (error: any) {
      logger.error('Upload process failed:', error);
      setErrorMessage(`Upload Failed: ${error.message || 'Please try again.'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setErrorMessage(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={!!request} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify Delivery & Upload Note</DialogTitle>
          <DialogDescription>
            Upload the delivery note for request ID: <strong>{request?.id}</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <FormItem>
            <Label htmlFor="file-upload">Delivery Note (PDF, JPG, PNG)</Label>
            <Input id="file-upload" type="file" onChange={handleFileChange} />
            {errorMessage && (
              <p className="text-sm font-medium text-destructive">{errorMessage}</p>
            )}
          </FormItem>
          {selectedFile && (
            <p className="text-sm text-muted-foreground">
              Selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading || !selectedFile}>
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUploading ? 'Uploading...' : 'Verify & Upload'}
              {!isUploading && <UploadCloud className="ml-2 h-4 w-4" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
