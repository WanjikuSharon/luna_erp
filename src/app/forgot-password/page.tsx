
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, Info } from 'lucide-react';

export default function ForgotPasswordPage() {
    const newLogoUrl = 'https://i.postimg.cc/9FzKTLkD/WhatsApp_Image_2025-10-15_at_00.18.06_514d4d8f.jpg';

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
        <div className="absolute left-4 top-4 md:left-8 md:top-8">
            <Button asChild variant="ghost">
                <Link href="/login">
                    <ChevronLeft className="mr-2" />
                    Back to login
                </Link>
            </Button>
        </div>
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
                <div className="relative size-12">
                    <Image src={newLogoUrl} alt="Luna Industries Logo" fill className="object-contain" />
                </div>
            </div>
          <CardTitle className="font-headline text-3xl">Password Reset</CardTitle>
          <CardDescription>
            Instructions for resetting your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-blue-500/20 bg-blue-500/10 p-6 text-center">
                <Info className="size-8 text-blue-500" />
                <h3 className="font-semibold text-blue-900 dark:text-blue-200">Contact ICT Department</h3>
                <p className="text-sm text-muted-foreground">
                    For security reasons, password resets must be handled directly by the ICT department. Please contact them to regain access to your account.
                </p>
            </div>
             <Button asChild className="mt-6 w-full">
                <Link href="/login">
                    Return to Login
                </Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}

    
