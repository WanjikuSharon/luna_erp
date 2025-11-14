// src/app/(app)/operations/packaging/page.tsx
'use client';

// This file is a copy of the "Raw Materials" logic from the inventory page,
// but dedicated to managing the "packaging_materials" collection.

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createLogger } from '@/lib/logger';
import {
  packagingMaterialSchema,
  type PackagingMaterialFormValues,
} from '@/lib/schemas';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore'; 
import type { PackagingMaterial } from '@/lib/types'; 
import { COLLECTIONS } from '@/services/inventory_service';

const logger = createLogger('operations-packaging');

export default function PackagingPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<PackagingMaterial | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<PackagingMaterial | null>(null);

  // --- Live Data Fetching ---
  const packagingRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.PACKAGING), [firestore]);
  const { data: packagingMaterials, isLoading } = useCollection<PackagingMaterial>(packagingRef);

  // --- Forms ---
  const addForm = useForm<PackagingMaterialFormValues>({
    resolver: zodResolver(packagingMaterialSchema),
    defaultValues: { sku: '', name: '', quantity: 0, reorderPoint: 0, unit: 'units' },
  });
  
  const editForm = useForm<PackagingMaterialFormValues>({
    resolver: zodResolver(packagingMaterialSchema),
  });

  // Pre-fill edit form
  useEffect(() => {
    if (editingMaterial) {
      editForm.reset(editingMaterial);
    }
  }, [editingMaterial, editForm]);

  // --- Status Helper ---
  function getStatus(item: PackagingMaterial) {
    if (item.quantity === 0) return { text: 'Out of Stock', variant: 'destructive' as const };
    if (item.quantity < item.reorderPoint) return { text: 'Low Stock', variant: 'outline' as const };
    return { text: 'In Stock', variant: 'secondary' as const };
  }

  // --- Form Submit Handlers ---
  async function onSubmitAdd(data: PackagingMaterialFormValues) {
    try {
        await addDoc(collection(firestore, COLLECTIONS.PACKAGING), data);
        toast({ title: "Material Added", description: `${data.name} has been added.` });
        addForm.reset();
        setIsAddDialogOpen(false);
    } catch (error) {
         logger.error("Error adding material:", error);
         toast({ variant: "destructive", title: "Save Failed", description: "Could not add material." });
    }
  }

  async function onSubmitEdit(data: PackagingMaterialFormValues) {
    if (!editingMaterial) return;
    try {
      const docRef = doc(firestore, COLLECTIONS.PACKAGING, editingMaterial.id);
      await updateDoc(docRef, data); // 'data' matches the schema perfectly
      toast({ title: "Material Updated", description: `${data.name} has been updated.` });
      setEditingMaterial(null);
    } catch (error) {
      logger.error("Error updating material:", error);
      toast({ variant: "destructive", title: "Update Failed", description: "Could not update material." });
    }
  }

  async function handleDelete() {
    if (!deletingMaterial) return;
    try {
      const docRef = doc(firestore, COLLECTIONS.PACKAGING, deletingMaterial.id);
      await deleteDoc(docRef);
      toast({ title: "Material Deleted", description: `${deletingMaterial.name} has been deleted.` });
    } catch (error) {
      logger.error("Error deleting material:", error);
      toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete material." });
    } finally {
      setDeletingMaterial(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* --- Header --- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Packaging Materials</h1>
          <p className="text-muted-foreground">
            Manage inventory for bottles, labels, stickers, and other packaging.
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4"/> Add Packaging</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Packaging Material</DialogTitle></DialogHeader>
            <PackagingForm
              form={addForm}
              onSubmit={onSubmitAdd}
              onClose={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* --- Main Table --- */}
      <Card>
        <CardHeader>
          <CardTitle>Packaging Stock</CardTitle>
          <CardDescription>Current inventory levels for all packaging materials.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Reorder At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(packagingMaterials ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center h-24">No packaging materials found.</TableCell></TableRow>
                )}
                {(packagingMaterials ?? []).map((item) => {
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
                      <TableCell className="text-muted-foreground">{item.reorderPoint}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingMaterial(item)}>
                          <Edit className="h-4 w-4"/>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingMaterial(item)}>
                          <Trash2 className="h-4 w-4"/>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* --- Edit Dialog --- */}
      <Dialog open={!!editingMaterial} onOpenChange={() => setEditingMaterial(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Packaging Material</DialogTitle></DialogHeader>
          <PackagingForm
            form={editForm}
            onSubmit={onSubmitEdit}
            onClose={() => setEditingMaterial(null)}
            submitText="Save Changes"
          />
        </DialogContent>
      </Dialog>
      
      {/* --- Delete Alert --- */}
      <DeleteMaterialAlert
        material={deletingMaterial}
        onOpenChange={() => setDeletingMaterial(null)}
        onDelete={handleDelete}
      />
    </div>
  );
}

// --- Reusable Form Component ---
function PackagingForm({
  form,
  onSubmit,
  onClose,
  submitText = "Save Material"
} : {
  form: ReturnType<typeof useForm<PackagingMaterialFormValues>>,
  onSubmit: (data: PackagingMaterialFormValues) => void,
  onClose: () => void,
  submitText?: string,
}) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SKU</FormLabel>
              <FormControl><Input placeholder="e.g., LUN-BOT-500" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Material Name</FormLabel>
              <FormControl><Input placeholder="e.g., 500ml Bottle" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Quantity</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="units">units</SelectItem>
                    <SelectItem value="rolls">rolls</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="reorderPoint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reorder Point</FormLabel>
              <FormControl><Input type="number" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitText}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// --- Reusable Delete Alert Component ---
function DeleteMaterialAlert({
  material,
  onOpenChange,
  onDelete,
}: {
  material: PackagingMaterial | null;
  onOpenChange: () => void;
  onDelete: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete();
    setIsDeleting(false);
  }

  return (
    <AlertDialog open={!!material} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the material
            <strong className="mx-1">{material?.name}</strong>
            from the database.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Yes, delete material
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
