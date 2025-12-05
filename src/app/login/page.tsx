'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card'; // We only need Card and CardContent
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { createLogger } from '@/lib/logger';
import type { User as UserType } from '@/lib/types';

const logger = createLogger('LoginPage');

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showNoAccountDialog, setShowNoAccountDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const newLogoUrl = 'https://i.postimg.cc/9FzKTLkD/WhatsApp_Image_2025-10-15_at_00.18.06_514d4d8f.jpg';



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (!email || !password) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please enter both email and password." });
      setIsSubmitting(false);
      return;
    }
    if (!email.endsWith('@luna.co.ke')) {
      toast({ variant: "destructive", title: "Invalid Email", description: "Please use your @luna.co.ke email address." });
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Wait for auth state to settle
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Fetch user data once to determine role
      const userDocRef = doc(firestore, 'users', userCredential.user.uid);
      const userSnap = await getDoc(userDocRef);
      
      if (!userSnap.exists()) {
        logger.warn('User document not found, defaulting to operations');
        router.push('/operations');
        return;
      }
      
      const userData = userSnap.data() as UserType;
      const role = userData.role;
      
      toast({
        title: "Login Successful",
        description: "Redirecting to your dashboard...",
      });
      
      // Redirect based on role
      if (role === 'admin') {
        router.push('/admin');
      } else if (role === 'operations' || role === 'operations_manager') {
        router.push('/operations');
      } else if (role === 'production' || role === 'production_personnel') {
        router.push('/production');
      } else if (role === 'sales') {
        router.push('/sales');
      } else {
        router.push('/operations');
      }
    } catch (error: any) {
      logger.error("Login failed:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid credentials. Please check your email and password.",
      });
      setIsSubmitting(false);
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
                    className="bg-white text-gray-900 placeholder:text-gray-400 border-gray-300"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-gray-700">Password</Label>
                  <div className="relative">
                    <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        required 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-white text-gray-900 placeholder:text-gray-400 border-gray-300 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'SIGNING IN...' : 'SIGN IN'}
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
