
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setCurrentUser, users } from '@/lib/data';
import type { User as UserType } from '@/lib/types';
import { useAuth, useUser } from '@/firebase';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"


export default function LoginPage() {
  const loginImage = PlaceHolderImages.find((img) => img.id === 'login-bg');
  const [email, setEmail] = useState('mercy.mugati@luna.co.ke');
  const [password, setPassword] = useState('password123');
  const [showNoAccountDialog, setShowNoAccountDialog] = useState(false);

  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const newLogoUrl = 'https://i.postimg.cc/9FzKTLkD/WhatsApp_Image_2025-10-15_at_00.18.06_514d4d8f.jpg';


  useEffect(() => {
    if (!isUserLoading && user) {
        const matchingUser = users.find(u => u.email.toLowerCase() === user.email?.toLowerCase());
        if (matchingUser) {
            setCurrentUser(matchingUser.role);
            switch (matchingUser.role) {
                case 'admin':
                    router.push('/admin');
                    break;
                case 'operations_manager':
                    router.push('/operations');
                    break;
                case 'production_personnel':
                    router.push('/production');
                    break;
                default:
                    router.push('/login');
            }
        } else {
            // This case can be handled more gracefully, e.g., show an error.
            // For now, it prevents a crash if the logged-in Firebase user isn't in our mock data.
            console.warn("Logged in user not found in mock data:", user.email);
        }
    }
  }, [user, isUserLoading, router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
        toast({
            variant: "destructive",
            title: "Missing fields",
            description: "Please enter both email and password.",
        })
        return;
    }

    if (!email.endsWith('@luna.co.ke')) {
        toast({
            variant: "destructive",
            title: "Invalid Email",
            description: "Please use your @luna.co.ke email address.",
        })
        return;
    }

    const userToLogin = users.find(u => u.email === email);
    
    if (userToLogin) {
        setCurrentUser(userToLogin.role);
        switch (userToLogin.role) {
            case 'admin':
            router.push('/admin');
            break;
            case 'operations_manager':
            router.push('/operations');
            break;
            case 'production_personnel':
            router.push('/production');
            break;
            default:
            router.push('/login');
        }
    } else {
        toast({
            variant: "destructive",
            title: "Login Failed",
            description: "Invalid credentials.",
        })
    }
  };

  return (
    <>
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-muted lg:block">
        {loginImage && (
            <Image
            src={loginImage.imageUrl}
            alt="Handcrafted jewelry"
            fill
            className="object-cover"
            data-ai-hint={loginImage.imageHint}
            />
        )}
        <div className="relative z-10 flex h-full flex-col justify-between bg-black/50 p-10 text-white">
            <div className="flex items-center gap-3">
                <div className="relative h-10 w-10">
                  <Image src={newLogoUrl} alt="Luna Industries Logo" fill className="object-contain" />
                </div>
                <span className="font-headline text-2xl tracking-widest">LUNA</span>
            </div>
            <div className="max-w-md">
                <h2 className="text-4xl font-bold font-headline">
                    Luna Industries ERP
                </h2>
                <p className="mt-4 text-lg text-white/80">
                    An internal system to streamline our operations, from raw materials to finished products.
                </p>
            </div>
            <footer className="text-sm text-white/60">
                Made with ❤️ by the ICT Department
            </footer>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12 lg:p-8">
        <Card className="mx-auto w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
          <CardHeader>
            <CardTitle className="font-headline text-3xl">Welcome Back</CardTitle>
            <CardDescription>
              Please sign in to access your ERP dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="manager@luna.co.ke"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="ml-auto inline-block text-sm underline"
                    prefetch={false}
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input 
                    id="password" 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isUserLoading}>
                {isUserLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
             <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{' '}
              <Button variant="link" className="p-0 h-auto" onClick={() => setShowNoAccountDialog(true)}>
                Contact ICT
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    <AlertDialog open={showNoAccountDialog} onOpenChange={setShowNoAccountDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Account Creation</AlertDialogTitle>
            <AlertDialogDescription>
                To create a new account, please contact the ICT department with your name and role details. They will set up an account for you.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowNoAccountDialog(false)}>OK</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

    
