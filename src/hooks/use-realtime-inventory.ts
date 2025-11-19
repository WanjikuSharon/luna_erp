// src/hooks/use-realtime-inventory.ts
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, Unsubscribe, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Product, RawMaterial } from '@/lib/types';

/**
 * Hook for real-time inventory updates
 * Listens to Firestore changes and updates state automatically
 */
export function useRealtimeInventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribers: Unsubscribe[] = [];

    try {
      // Listen to products collection
      const productsQuery = query(
        collection(db, 'products'),
        orderBy('createdAt', 'desc')
      );

      const unsubProducts = onSnapshot(
        productsQuery,
        (snapshot) => {
          const items = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Product[];
          setProducts(items);
          setIsLoading(false);
        },
        (err) => {
          console.error('Error listening to products:', err);
          setError(err as Error);
          setIsLoading(false);
        }
      );
      unsubscribers.push(unsubProducts);

      // Listen to raw materials collection
      const materialsQuery = query(
        collection(db, 'rawMaterials'),
        orderBy('createdAt', 'desc')
      );

      const unsubMaterials = onSnapshot(
        materialsQuery,
        (snapshot) => {
          const items = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as RawMaterial[];
          setRawMaterials(items);
        },
        (err) => {
          console.error('Error listening to raw materials:', err);
          setError(err as Error);
        }
      );
      unsubscribers.push(unsubMaterials);
    } catch (err) {
      console.error('Error setting up real-time listeners:', err);
      setError(err as Error);
      setIsLoading(false);
    }

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  return { products, rawMaterials, isLoading, error };
}

/**
 * Hook for real-time updates on a specific product
 */
export function useRealtimeProduct(productId: string | null) {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!db || !productId) {
      setIsLoading(false);
      setProduct(null);
      return;
    }

    setIsLoading(true);

    const unsubscribe = onSnapshot(
      doc(db!, 'products', productId),
      (docSnap) => {
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() } as Product);
        } else {
          setProduct(null);
        }
        setIsLoading(false);
      },
      (err: Error) => {
        console.error('Error listening to product:', err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [productId]);

  return { product, isLoading, error };
}

/**
 * Hook for real-time low stock alerts
 */
export function useLowStockAlerts() {
  const [lowStockItems, setLowStockItems] = useState<{
    products: Product[];
    materials: RawMaterial[];
  }>({
    products: [],
    materials: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    const unsubscribers: Unsubscribe[] = [];

    try {
      // Listen to products with low stock
      const productsQuery = collection(db, 'products');
      const unsubProducts = onSnapshot(productsQuery, (snapshot) => {
        const items = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }) as Product)
          .filter((p) => p.quantity <= 10); // Products don't have reorderLevel
        
        setLowStockItems((prev) => ({ ...prev, products: items }));
        setIsLoading(false);
      });
      unsubscribers.push(unsubProducts);

      // Listen to raw materials with low stock
      const materialsQuery = collection(db, 'rawMaterials');
      const unsubMaterials = onSnapshot(materialsQuery, (snapshot) => {
        const items = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }) as RawMaterial)
          .filter((m) => m.quantity <= (m.reorderPoint || 100));
        
        setLowStockItems((prev) => ({ ...prev, materials: items }));
      });
      unsubscribers.push(unsubMaterials);
    } catch (err) {
      console.error('Error setting up low stock listeners:', err);
      setIsLoading(false);
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  return { lowStockItems, isLoading };
}
