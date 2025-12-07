// src/components/admin/EtimsProductRegistration.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { createLogger } from '@/lib/logger';

const logger = createLogger('etims-registration');

export function EtimsProductRegistration() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationResults, setRegistrationResults] = useState<{
    succeeded: string[];
    failed: { itemCode: string; error: string }[];
  } | null>(null);

  const productsRef = useMemoFirebase(
    () => collection(firestore, 'products'),
    [firestore]
  );
  
  const { data: products, isLoading } = useCollection<Product>(productsRef);

  const handleRegisterAll = async () => {
    if (!products || products.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Products',
        description: 'No products found to register',
      });
      return;
    }

    setIsRegistering(true);
    setRegistrationResults(null);

    try {
      const response = await fetch('/api/etims/register-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products: products.map(p => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            unitPrice: 0, // You may want to add price to Product type
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorDetails = data.details ? `: ${JSON.stringify(data.details)}` : '';
        const errorHint = data.hint ? `\n${data.hint}` : '';
        throw new Error(`${data.error || 'Registration failed'}${errorDetails}${errorHint}`);
      }

      setRegistrationResults({
        succeeded: data.succeeded,
        failed: data.failed,
      });

      toast({
        title: 'Registration Complete',
        description: `${data.succeeded.length} products registered successfully`,
      });

    } catch (error: any) {
      logger.error('Product registration failed:', error);
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: error.message,
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const registeredCount = products?.filter((p: any) => p.etimsRegistered === true).length || 0;
  const totalCount = products?.length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>eTIMS Product Registration</CardTitle>
        <CardDescription>
          Register your products with KRA eTIMS before generating invoices.
          This is a one-time setup for each product.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Registration Status</p>
            <p className="text-2xl font-bold">
              {registeredCount} / {totalCount}
            </p>
            <p className="text-xs text-muted-foreground">
              products registered with eTIMS
            </p>
          </div>
          <Button
            onClick={handleRegisterAll}
            disabled={isRegistering || isLoading || totalCount === 0}
            size="lg"
          >
            {isRegistering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Register All Products
          </Button>
        </div>

        {registrationResults && (
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-medium">
                {registrationResults.succeeded.length} Successful
              </span>
            </div>
            
            {registrationResults.failed.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium">
                    {registrationResults.failed.length} Failed
                  </span>
                </div>
                <div className="ml-7 space-y-1">
                  {registrationResults.failed.map((f) => (
                    <div key={f.itemCode} className="text-sm text-muted-foreground">
                      <span className="font-medium">{f.itemCode}:</span> {f.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
          <div className="flex gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Before Registering Products
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Make sure you have configured your eTIMS credentials in the .env.local file
                and that you are using the sandbox environment for testing.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
