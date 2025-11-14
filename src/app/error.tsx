'use client' 

import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react'
import { Button } from '@/components/ui/button';
import { ServerCrash } from 'lucide-react';
import { handleError } from '@/lib/error-handler';
import { createLogger } from '@/lib/logger';

const logger = createLogger('app-error');
 
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Use centralized error handler
    const appError = handleError(error, 'app-error');
    logger.error('Application error:', appError);
  }, [error])

  const newLogoUrl = 'https://i.postimg.cc/9FzKTLkD/WhatsApp_Image_2025-10-15_at_00.18.06_514d4d8f.jpg';
 
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4 text-center">
        <div className="flex items-center gap-4">
            <div className="relative size-10">
                <Image src={newLogoUrl} alt="Luna Industries Logo" fill className="object-contain" />
            </div>
            <span className="font-headline text-2xl tracking-widest">LUNA</span>
        </div>
        <div className="space-y-4">
            <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-destructive/50 bg-destructive/10 px-4 py-1.5 text-destructive">
                <ServerCrash className="size-4" />
                <span className="text-sm font-medium">Application Error</span>
            </div>
            <h1 className="text-5xl font-bold font-headline tracking-tight">
                Something went wrong
            </h1>
            <p className="max-w-lg text-muted-foreground">
                We're sorry, but the application encountered an unexpected error. Please try again. If the problem persists, contact the ICT department.
            </p>
        </div>
        <div className="flex gap-4">
            <Button onClick={() => reset()}>
                Try Again
            </Button>
            <Button variant="outline" asChild>
                <Link href="/">Go to Dashboard</Link>
            </Button>
        </div>
    </div>
  )
}
