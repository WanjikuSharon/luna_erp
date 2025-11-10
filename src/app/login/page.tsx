'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card'; // We only need Card and CardContent
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { doc } from 'firebase/firestore'; // Import doc
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase'; // Import Firestore hooks
import type { User as UserType } from '@/lib/types'; // Import UserType
import { signInWithEmailAndPassword } from 'firebase/auth'; // Import for login

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showNoAccountDialog, setShowNoAccountDialog] = useState(false);

  // --- All your existing hooks (unchanged) ---
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  // --- New Logo URL ---
  const newLogoUrl = 'https://i.postimg.cc/9FzKTLkD/WhatsApp_Image_2025-10-15_at_00.18.06_514d4d8f.jpg';
  
  // --- New Firestore user data fetching ---
  const firestore = useFirestore(); 
  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userData, isLoading: isUserDataLoading, error: userDataError } = useDoc<UserType>(userDocRef);

  // Log any errors from Firestore
  useEffect(() => {
    if (userDataError) {
      console.error('Firestore error when fetching user data:', userDataError);
    }
  }, [userDataError]);

  // --- Sign out any existing user when visiting login page ---
  useEffect(() => {
    if (!isUserLoading && user) {
      console.log('User already logged in, signing out to show login form');
      auth.signOut();
    }
  }, [isUserLoading, user, auth]);

  // --- Redirect after successful login ---
  useEffect(() => {
    // Only redirect if user just logged in (has both auth user and userData)
    if (!isUserLoading && !isUserDataLoading && user && userData) {
      console.log('User authenticated, redirecting to dashboard:', userData);
      switch (userData.role) {
        case 'admin':
          router.push('/admin');
          break;
        case 'operations':
          router.push('/operations');
          break;
        case 'production':
          router.push('/production');
          break;
        case 'sales':
          router.push('/sales');
          break;
        default:
          router.push('/operations');
      }
    }
  }, [user, isUserLoading, userData, isUserDataLoading, router]);

  // --- Your existing login logic ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please enter both email and password." });
      return;
    }
    if (!email.endsWith('@luna.co.ke')) {
      toast({ variant: "destructive", title: "Invalid Email", description: "Please use your @luna.co.ke email address." });
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Redirect is handled by the useEffect hook above
    } catch (error: any) {
      console.error("Login failed:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid credentials. Please check your email and password.",
      });
    }
  };

  // --- NEW AESTHETIC / LAYOUT ---
  return (
    <>
      <div className="relative flex min-h-screen w-full items-center justify-center p-4">
        {/* Background Image - Stretch to fill entire screen */}
        <Image
          src="/login-background.jpg" // Uses the image from your public/ folder
          alt="Luna Industries products in a kitchen"
          fill
          className="object-cover object-center z-0"
          priority
          quality={100}
        />

        {/* Login Modal Card */}
        <Card className="w-full max-w-4xl z-10 shadow-2xl overflow-hidden rounded-lg">
          <CardContent className="p-0 flex flex-col md:flex-row">
            
            {/* Left Side (Blue Panel) */}
            <div className="w-full md:w-1/2 bg-[#096394] text-white p-8 md:p-12 flex flex-col justify-center items-center text-center">
              <h2 className="font-headline text-3xl font-bold tracking-tight mb-4">
                Luna Industries
              </h2>
              <p className="mb-6 text-white/80">
                Premium Home and Body Care
              </p>
              <div className="relative h-40 w-40 mb-4">
                <Image 
                  src={newLogoUrl} 
                  alt="Luna Industries Logo" 
                  fill 
                  className="object-contain rounded-full" 
                />
              </div>
            </div>

            {/* Right Side (Form Panel) */}
            <div className="w-full md:w-1/2 p-8 md:p-12 bg-white">
              <h2 className="font-headline text-4xl md:text-5xl font-extrabold text-center text-[#096394] mb-6 drop-shadow-md tracking-wide">
                ERP SYSTEM
              </h2>

              <form onSubmit={handleLogin} className="grid gap-4 mt-6">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-gray-700">User ID</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-gray-700">Password</Label>
                  <Input 
                      id="password" 
                      type="password"
                      placeholder="Enter your password"
                      required 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="text-gray-900 placeholder:text-gray-400"
                  />
                  <Link
                    href="/forgot-password"
                    className="text-sm text-red-600 hover:text-red-700 hover:underline font-medium"
                    prefetch={false}
                  >
                    Forgot Password?
                  </Link>
                </div>
                {/* Updated button color to golden orange */}
                <Button 
                  type="submit" 
                  className="w-full bg-[#FF8C42] hover:bg-[#ff7a28] text-white" 
                  disabled={isUserLoading || isUserDataLoading}
                >
                  {isUserLoading || isUserDataLoading ? 'SIGNING IN...' : 'SIGN IN'}
                </Button>
              </form>
              
              <div className="mt-4 text-center text-sm text-gray-700">
                Don&apos;t have an account?{' '}
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-[#096394] hover:text-[#074d73] font-medium" 
                  onClick={() => setShowNoAccountDialog(true)}
                >
                  Contact ICT
                </Button>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>

      {/* This is your existing dialog for "Don't have an account?" It remains unchanged. */}
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