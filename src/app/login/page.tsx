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
  const [email, setEmail] = useState('mercy.mugati@luna.co.ke');
  const [password, setPassword] = useState('password123');
  const [showNoAccountDialog, setShowNoAccountDialog] = useState(false);

  // --- All your existing hooks (unchanged) ---
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  // This is the new logo URL from your other files
  const newLogoUrl = 'https://i.postimg.cc/9FzKTLkD/WhatsApp_Image_2025-10-15_at_00.18.06_514d4d8f.jpg';
  
  // --- New Firestore hooks (from our previous conversation) ---
  const firestore = useFirestore(); 
  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserType>(userDocRef);

  // --- Your existing redirect logic (unchanged) ---
  useEffect(() => {
    if (!isUserLoading && !isUserDataLoading) {
      if (user && userData) {
        switch (userData.role) {
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
      } else if (user && !userData) {
        console.error("User document not found for UID:", user.uid);
        toast({
          variant: "destructive",
          title: "Profile Error",
          description: "Your user account is not fully set up. Please contact ICT.",
        });
        auth.signOut(); 
      }
    }
  }, [user, isUserLoading, userData, isUserDataLoading, router, auth, toast]);

  // --- Your existing login logic (unchanged) ---
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      if (!user.emailVerified) {
        toast({
          variant: "destructive",
          title: "Verification Required",
          description: "Please check your inbox and verify your email address.",
        });
        await auth.signOut();
        return;
      }
      // Redirect is handled by the useEffect hook
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
        {/* Background Image */}
        <Image
          src="/login-background.jpg" // Uses the image from your public/ folder
          alt="Luna Industries products in a kitchen"
          fill
          className="object-cover z-0"
        />

        {/* Login Modal Card */}
        <Card className="w-full max-w-4xl z-10 shadow-2xl overflow-hidden rounded-lg">
          <CardContent className="p-0 flex flex-col md:flex-row">
            
            {/* Left Side (Blue Panel) */}
            <div className="w-full md:w-2/5 bg-[#096394] text-white p-8 md:p-12 flex flex-col justify-center items-center text-center">
              <div className="relative h-24 w-24 mb-4">
                <Image 
                  src={newLogoUrl} 
                  alt="Luna Industries Logo" 
                  fill 
                  className="object-contain rounded-full" 
                />
              </div>
              <h2 className="font-headline text-3xl font-bold tracking-tight">
                Luna Industries
              </h2>
              <p className="mt-2 text-white/80">
                Premium Home and Body Care
              </p>
            </div>

            {/* Right Side (Form Panel) */}
            <div className="w-full md:w-3/5 p-8 md:p-12">
              <h2 className="font-headline text-3xl font-bold text-center md:text-left">
                ERP System
              </h2>

              <form onSubmit={handleLogin} className="grid gap-4 mt-6">
                <div className="grid gap-2">
                  {/* Changed "Email" to "User ID" to match screenshot */}
                  <Label htmlFor="email">User ID</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="21/04820" // Placeholder from screenshot
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
                      className="ml-auto inline-block text-sm text-red-600 hover:underline" // Updated color
                      prefetch={false}
                    >
                      Forgot Password?
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
                {/* Updated button color and text */}
                <Button 
                  type="submit" 
                  className="w-full bg-[#B5914A] hover:bg-[#a18243] text-white" 
                  disabled={isUserLoading || isUserDataLoading}
                >
                  {isUserLoading || isUserDataLoading ? 'SIGNING IN...' : 'SIGN IN'}
                </Button>
              </form>
              
              <div className="mt-4 text-center text-sm">
                Don&apos;t have an account?{' '}
                <Button variant="link" className="p-0 h-auto" onClick={() => setShowNoAccountDialog(true)}>
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