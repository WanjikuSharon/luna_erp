
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function NotFound() {
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
            <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-amber-500/50 bg-amber-500/10 px-4 py-1.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-4" />
                <span className="text-sm font-medium">Error 404</span>
            </div>
            <h1 className="text-5xl font-bold font-headline tracking-tight">
                Page Not Found
            </h1>
            <p className="max-w-md text-muted-foreground">
                Oops! The page you're looking for doesn't seem to exist. It might have been moved, deleted, or maybe you just mistyped the URL.
            </p>
        </div>
        <Button asChild>
            <Link href="/">Return to Dashboard</Link>
        </Button>
    </div>
  );
}
