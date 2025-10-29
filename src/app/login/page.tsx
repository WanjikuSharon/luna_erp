
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
import type { User as UserType } from '@/lib/types';
import { useAuth, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc } from 'firebase/firestore';
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

  // Get the Firestore instance
  const firestore = useFirestore();

  // Create a memoized reference to the user's document
  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );

  // Fetch the document data
  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserType>(userDocRef);


  useEffect(() => {
    // Wait for auth to finish AND our user document to finish loading
    if (!isUserLoading && !isUserDataLoading) {

      if (user && userData) {
        // User is logged in AND we have their role data from Firestore!
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
            // Fallback if role is unknown
            router.push('/login');
        }
      } else if (user && !userData) {
        // TEMPORARILY BYPASSED FOR DEVELOPMENT
        // Fallback: Use email to determine role when Firestore document doesn't exist
        console.warn("User document not found in Firestore for UID:", user.uid, "- Using email-based routing");
        
        const email = user.email?.toLowerCase() || '';
        
        if (email.includes('mark.maina') || email.includes('admin')) {
          router.push('/admin');
        } else if (email.includes('mercy.mugati') || email.includes('operations')) {
          router.push('/operations');
        } else if (email.includes('peter.kamau') || email.includes('production')) {
          router.push('/production');
        } else {
          // Default fallback
          router.push('/operations');
        }
        
        /* ORIGINAL CODE - COMMENTED OUT FOR DEVELOPMENT
        console.error("User document not found in Firestore for UID:", user.uid);
        toast({
          variant: "destructive",
          title: "Profile Error",
          description: "Your user account is not fully set up. Please contact ICT.",
        });
        auth.signOut(); // Log them out so they don't get stuck
        */
      }
      // If !user (user is null), we do nothing and they stay on the login page.
    }
  }, [
    user, 
    isUserLoading, 
    userData, 
    isUserDataLoading, 
    router, 
    auth, 
    toast
  ]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Keep this validation
    if (!email || !password) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please enter both email and password." });
      return;
    }

    // 2. Keep this @luna.co.ke check (Requirement)
    if (!email.endsWith('@luna.co.ke')) {
      toast({ variant: "destructive", title: "Invalid Email", description: "Please use your @luna.co.ke email address." });
      return;
    }

    // 3. THIS IS THE NEW LOGIC: Try to sign in with Firebase
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 4. Check for email verification (Requirement)
      // TEMPORARILY DISABLED FOR DEVELOPMENT
      /* 
      if (!user.emailVerified) {
        toast({
          variant: "destructive",
          title: "Verification Required",
          description: "Please check your inbox and verify your email address before logging in.",
        });
        await auth.signOut(); // Sign them out until they are verified
        return;
      }
      */

      // 5. The useEffect hook above will handle the redirect automatically!
      // No need for manual router.push() here - the useEffect watches the user state

    } catch (error: any) {
      // 6. Handle login errors
      console.error("Login failed:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid credentials. Please check your email and password.",
      });
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

    
