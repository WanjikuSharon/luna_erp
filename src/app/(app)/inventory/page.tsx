'use client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { RawMaterial, Product } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

function getStatus(item: RawMaterial): { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
    if (item.quantity === 0) return { text: 'Out of Stock', variant: 'destructive' };
    if (item.quantity < item.reorderPoint) return { text: 'Low Stock', variant: 'outline' };
    return { text: 'In Stock', variant: 'secondary' };
}

function InventoryTableSkeleton() {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}


export default function InventoryPage() {
  const firestore = useFirestore();

  const rawMaterialsRef = useMemoFirebase(() => collection(firestore, 'raw_materials'), [firestore]);
  const productsRef = useMemoFirebase(() => collection(firestore, 'products'), [firestore]);

  const { data: rawMaterials, isLoading: isLoadingMaterials } = useCollection<RawMaterial>(rawMaterialsRef);
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsRef);

  const isLoading = isLoadingMaterials || isLoadingProducts;

  return (
    <div className="flex flex-col gap-6">
        <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Inventory Status</h1>
            <p className="text-muted-foreground">
                A complete overview of your raw materials and finished products.
            </p>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>All Stock</CardTitle>
                <CardDescription>
                    Raw materials and finished goods currently in your warehouses.
                </CardDescription>
            </CardHeader>
            <CardContent>
            {isLoading ? <InventoryTableSkeleton /> : (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead>Unit</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {(rawMaterials ?? []).map((item: RawMaterial) => {
                        const status = getStatus(item);
                        return (
                            <TableRow key={item.id}>
                            <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>
                                <Badge variant={status.variant} className={status.variant === 'outline' ? 'border-amber-500 text-amber-500' : ''}>
                                    {status.text}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">{item.quantity.toLocaleString()}</TableCell>
                            <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                            </TableRow>
                        );
                    })}
                    {(products ?? []).map((item: Product) => (
                        <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                            <Badge variant="secondary">In Stock</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{item.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            )}
            </CardContent>
        </Card>
    </div>
  );
}
