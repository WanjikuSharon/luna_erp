// src/app/(app)/sales/dashboard/page.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createLogger } from '@/lib/logger';
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
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2, Loader2, DollarSign, Package, Users } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, Timestamp, serverTimestamp } from 'firebase/firestore'; 
import type { Salesperson, DailySalesLedgerEntry } from '@/lib/types'; 
import { COLLECTIONS } from '@/services/inventory_service';

// --- Form Schema for "Add/Edit Salesperson" ---
const salespersonFormSchema = z.object({
  name: z.string().min(2, 'Salesperson name is required.'),
  phone: z.string().min(10, 'A valid phone number is required.'),
  // We can add email/address later if needed
});
type SalespersonFormValues = z.infer<typeof salespersonFormSchema>;

const logger = createLogger('sales-dashboard');

export default function SalesDashboardPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: authUser } = useUser();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Salesperson | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<Salesperson | null>(null);

  // --- Live Data Fetching ---
  const salespeopleRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.SALESPEOPLE), [firestore]);
  const { data: salespeople, isLoading: isLoadingSalespeople } = useCollection<Salesperson>(salespeopleRef);

  // Get today's start and end timestamps
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartTimestamp = Timestamp.fromDate(todayStart);

  // Fetch today's sales ledger entries
  const ledgerTodayRef = useMemoFirebase(
    () => query(
      collection(firestore, 'daily_sales_ledger'), 
      where('date', '>=', todayStartTimestamp)
    ), 
    [firestore, todayStartTimestamp]
  );
  const { data: todayLedgerEntries, isLoading: isLoadingLedger } = useCollection<DailySalesLedgerEntry>(ledgerTodayRef);

  const isLoading = isLoadingSalespeople || isLoadingLedger;

  // --- Calculate Dashboard Stats (from image) ---
  const dashboardStats = useMemo(() => {
    const agents = salespeople || [];
    const sales = todayLedgerEntries || [];

    const totalSalesToday = sales.reduce((acc, entry) => acc + entry.amountSold, 0);
    const productsSoldToday = sales.reduce((acc, entry) => acc + entry.productsSold, 0);
    const activeAgents = agents.length; // Simple count for now
    
    // Find top performer
    const salesByAgent: { [key: string]: number } = {};
    let topPerformerName = 'N/A';
    let topPerformerSales = 0;
    
    sales.forEach(entry => {
      salesByAgent[entry.agentName] = (salesByAgent[entry.agentName] || 0) + entry.amountSold;
    });
    
    for (const agentName in salesByAgent) {
      if (salesByAgent[agentName] > topPerformerSales) {
        topPerformerSales = salesByAgent[agentName];
        topPerformerName = agentName;
      }
    }

    return { totalSalesToday, productsSoldToday, activeAgents, topPerformerName, topPerformerSales };
  }, [salespeople, todayLedgerEntries]);

  // --- Forms ---
  const addForm = useForm<SalespersonFormValues>({
    resolver: zodResolver(salespersonFormSchema),
    defaultValues: { name: '', phone: '' },
  });
  
  const editForm = useForm<SalespersonFormValues>({
    resolver: zodResolver(salespersonFormSchema),
  });

  // Pre-fill edit form
  useEffect(() => {
    if (editingAgent) {
      editForm.reset(editingAgent);
    }
  }, [editingAgent, editForm]);

  // --- Activity Logger ---
  const logSalesActivity = async (action: string) => {
    // Require authentication for logging activities
    if (!authUser) {
      logger.warn("Cannot log activity: User not authenticated");
      return;
    }

    const userName = authUser.displayName || authUser.email || 'Sales Manager';
    const userAvatar = authUser.photoURL || '';

    try {
      await addDoc(collection(firestore, 'sales_activities'), {
        action: action,
        user: { name: userName, avatarUrl: userAvatar },
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      logger.error("Failed to log sales activity:", error);
    }
  };

  // --- Form Submit Handlers ---
  async function onSubmitAdd(data: SalespersonFormValues) {
    try {
        await addDoc(collection(firestore, COLLECTIONS.SALESPEOPLE), data);
        await logSalesActivity(`added new agent: ${data.name}`);
        toast({ title: "Agent Added", description: `${data.name} has been added.` });
        addForm.reset();
        setIsAddDialogOpen(false);
    } catch (error) {
         logger.error("Error adding agent:", error);
         toast({ variant: "destructive", title: "Save Failed", description: "Could not add agent." });
    }
  }

  async function onSubmitEdit(data: SalespersonFormValues) {
    if (!editingAgent) return;
    try {
      const docRef = doc(firestore, COLLECTIONS.SALESPEOPLE, editingAgent.id);
      await updateDoc(docRef, { ...data });
      await logSalesActivity(`updated agent: ${data.name}`);
      toast({ title: "Agent Updated", description: `${data.name} has been updated.` });
      setEditingAgent(null);
    } catch (error) {
      logger.error("Error updating agent:", error);
      toast({ variant: "destructive", title: "Update Failed", description: "Could not update agent." });
    }
  }

  async function handleDelete() {
    if (!deletingAgent) return;
    try {
      const docRef = doc(firestore, COLLECTIONS.SALESPEOPLE, deletingAgent.id);
      await deleteDoc(docRef);
      await logSalesActivity(`deleted agent: ${deletingAgent.name}`);
      toast({ title: "Agent Deleted", description: `${deletingAgent.name} has been deleted.` });
    } catch (error) {
      logger.error("Error deleting agent:", error);
      toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete agent." });
    } finally {
      setDeletingAgent(null);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* --- Header --- */}
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Sales Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of sales operations and agent performance.
          </p>
        </div>

        {/* --- Stat Cards (from image) --- */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales Today</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-32" /> : (
                <div className="text-2xl font-bold">KSh {dashboardStats.totalSalesToday.toLocaleString()}</div>
              )}
              <p className="text-xs text-muted-foreground">+0% from yesterday (NA)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products Sold Today</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold">+{dashboardStats.productsSoldToday.toLocaleString()}</div>
              )}
              <p className="text-xs text-muted-foreground">total units</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold">{dashboardStats.activeAgents}</div>
              )}
              <p className="text-xs text-muted-foreground">all agents in system</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Performer (Today)</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : (
                <div className="text-2xl font-bold">{dashboardStats.topPerformerName}</div>
              )}
              <p className="text-xs text-muted-foreground">KSh {dashboardStats.topPerformerSales.toLocaleString()} in sales</p>
            </CardContent>
          </Card>
        </div>

        {/* --- Welcome & Sales Team Management --- */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Welcome to the Sales Portal</CardTitle>
              <CardDescription>Manage your sales operations and track performance.</CardDescription>
            </CardHeader>
            <CardContent>
              <h4 className="font-semibold mb-2">Quick Actions</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Record stock issued to agents in **Stock Out**.</li>
                <li>Track returns from agents in **Stock In / Returns**.</li>
                <li>Log daily sales totals in **Daily Sales Ledger**.</li>
                <li>Reconcile agent stock in **Daily Reconciliation**.</li>
              </ul>
            </CardContent>
          </Card>
          
          {/* --- Sales Team Management Card --- */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Sales Team Management</CardTitle>
                  <CardDescription>Add, edit, or remove sales agents.</CardDescription>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2 h-4 w-4"/> Add Agent</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add New Sales Agent</DialogTitle></DialogHeader>
                    <SalespersonForm
                      form={addForm}
                      onSubmit={onSubmitAdd}
                      onClose={() => setIsAddDialogOpen(false)}
                      submitText="Save Agent"
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSalespeople ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(salespeople ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center h-24">No salespeople found.</TableCell></TableRow>
                    )}
                    {(salespeople ?? []).map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell className="font-medium">{agent.name}</TableCell>
                        <TableCell className="text-muted-foreground">{agent.phone}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="link" className="px-2" onClick={() => setEditingAgent(agent)}>
                            Edit
                          </Button>
                          <Button variant="link" className="px-2 text-destructive hover:text-destructive" onClick={() => setDeletingAgent(agent)}>
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* --- Edit Dialog --- */}
      <Dialog open={!!editingAgent} onOpenChange={() => setEditingAgent(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Sales Agent</DialogTitle></DialogHeader>
          <SalespersonForm
            form={editForm}
            onSubmit={onSubmitEdit}
            onClose={() => setEditingAgent(null)}
            submitText="Save Changes"
          />
        </DialogContent>
      </Dialog>
      
      {/* --- Delete Alert --- */}
      <DeleteSalespersonAlert
        agent={deletingAgent}
        onOpenChange={() => setDeletingAgent(null)}
        onDelete={handleDelete}
      />
    </>
  );
}

// --- Reusable Form Component ---
function SalespersonForm({
  form,
  onSubmit,
  onClose,
  submitText = "Save"
} : {
  form: ReturnType<typeof useForm<SalespersonFormValues>>,
  onSubmit: (data: SalespersonFormValues) => void,
  onClose: () => void,
  submitText?: string,
}) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Agent Name</FormLabel>
              <FormControl><Input placeholder="e.g., Maina Kinyua" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl><Input placeholder="e.g., 0712345678" {...field} /></FormControl>
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
function DeleteSalespersonAlert({
  agent,
  onOpenChange,
  onDelete,
}: {
  agent: Salesperson | null;
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
    <AlertDialog open={!!agent} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the agent
            <strong className="mx-1">{agent?.name}</strong>
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
            Yes, delete agent
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
