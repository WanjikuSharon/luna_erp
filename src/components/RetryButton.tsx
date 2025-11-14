// src/components/RetryButton.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { retryOperation, handleError } from '@/lib/error-handler';
import { useToast } from '@/hooks/use-toast';

interface RetryButtonProps {
  operation: () => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  maxRetries?: number;
  label?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

/**
 * A button component that automatically retries failed operations
 * with exponential backoff
 */
export function RetryButton({
  operation,
  onSuccess,
  onError,
  maxRetries = 3,
  label = 'Retry',
  variant = 'outline',
  size = 'default',
  className,
}: RetryButtonProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();

  const handleRetry = async () => {
    setIsRetrying(true);
    
    try {
      await retryOperation(operation, maxRetries);
      
      toast({
        title: 'Success',
        description: 'Operation completed successfully',
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      const appError = handleError(error, 'RetryButton');
      
      toast({
        variant: 'destructive',
        title: 'Operation Failed',
        description: appError.message,
      });
      
      if (onError) {
        onError(error);
      }
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Button
      onClick={handleRetry}
      disabled={isRetrying}
      variant={variant}
      size={size}
      className={className}
    >
      {isRetrying ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Retrying...
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  );
}
