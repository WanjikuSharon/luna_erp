// src/app/(app)/admin/page.tsx
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
// UPDATED: Import DailySalesReport and ProductionBatch
import type { User, Activity, DailySalesReport, ProductionBatch, DailySalesLedgerEntry } from '@/lib/types';
import { MoreHorizontal, User as UserIcon, Activity as ActivityIcon, AlertTriangle, ShieldCheck, Loader2, FileText, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
// UPDATED: Import format and subDays
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
// UPDATED: Import 'where' and 'Timestamp'
import { collection, query, orderBy, doc, deleteDoc, updateDoc, addDoc, serverTimestamp, where, Timestamp } from 'firebase/firestore'; 
import { COLLECTIONS } from '@/services/inventory_service';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
// NEW: Import the report sheet
import { DailySalesReportSheet } from '@/components/reports/DailySalesReportSheet';
// NEW: Import the combined activity log
import { CombinedActivityLog } from '@/components/CombinedActivityLog';
import { ACTIVITY_COLLECTIONS, createActivityQuery } from '@/lib/activity-utils';

// Role config with all possible roles
const roleConfig = {
    admin: { label: 'Admin', variant: 'destructive' as const },
    operations_manager: { label: 'Operations Manager', variant: 'default' as const },
    production_personnel: { label: 'Production Personnel', variant: 'secondary' as const },
    sales: { label: 'Sales', variant: 'default' as const },
    operations: { label: 'Operations', variant: 'default' as const },
    production: { label: 'Production', variant: 'secondary' as const },
};
const userRoles = Object.keys(roleConfig) as (keyof typeof roleConfig)[];
const editUserSchema = z.object({
  role: z.enum(['admin', 'operations_manager', 'production_personnel', 'sales', 'operations', 'production'] as const),
});
type EditUserFormValues = z.infer<typeof editUserSchema>;

const logger = createLogger('admin-dashboard');

export default function AdminDashboardPage() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user: adminUser } = useUser();
    
    // --- UPDATED: Fetch All Data for Dashboard ---
    const usersRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.USERS), [firestore]);
    const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersRef);
    
    // Get timestamp for 24 hours ago
    const oneDayAgo = subDays(new Date(), 1);
    const oneDayAgoTimestamp = Timestamp.fromDate(oneDayAgo);

    // Query for admin activities
    const adminActivitiesRef = useMemoFirebase(
      () => query(collection(firestore, 'admin_activities'), where('timestamp', '>=', oneDayAgoTimestamp)),
      [firestore, oneDayAgoTimestamp]
    );
    const { data: adminActivities, isLoading: isLoadingAdminActivities } = useCollection<Activity>(adminActivitiesRef);

    // Query for operations activities
    const opsActivitiesRef = useMemoFirebase(
      () => query(collection(firestore, 'operations_activities'), where('timestamp', '>=', oneDayAgoTimestamp)),
      [firestore, oneDayAgoTimestamp]
    );
    const { data: opsActivities, isLoading: isLoadingOpsActivities } = useCollection<Activity>(opsActivitiesRef);
    
    // Query for production batches
    const prodBatchesRef = useMemoFirebase(
      () => query(collection(firestore, 'production_batches'), where('createdAt', '>=', oneDayAgoTimestamp)),
      [firestore, oneDayAgoTimestamp]
    );
    const { data: prodBatches, isLoading: isLoadingProdBatches } = useCollection<ProductionBatch>(prodBatchesRef);

    // NEW: Query for sales ledger entries
    const salesLedgerRef = useMemoFirebase(
      () => query(collection(firestore, 'daily_sales_ledger'), where('createdAt', '>=', oneDayAgoTimestamp)),
      [firestore, oneDayAgoTimestamp]
    );
    const { data: salesLedgerEntries, isLoading: isLoadingSalesLedger } = useCollection<DailySalesLedgerEntry>(salesLedgerRef);

    // NEW: Query for van stock logs
    const vanStockRef = useMemoFirebase(
      () => query(collection(firestore, 'van_stock_logs'), where('createdAt', '>=', oneDayAgoTimestamp)),
      [firestore, oneDayAgoTimestamp]
    );
    const { data: vanStockLogs, isLoading: isLoadingVanStock } = useCollection<any>(vanStockRef); // Using 'any' for simplicity

    // --- NEW: Fetch Daily Sales Reports (for the new card) ---
    const salesReportsRef = useMemoFirebase(
      () => query(collection(firestore, 'daily_sales_records'), orderBy('date', 'desc')),
      [firestore]
    );
    const { data: dailySalesReports, isLoading: isLoadingSalesReports } = useCollection<DailySalesReport>(salesReportsRef);

    // --- NEW: Queries for Combined Activity Log ---
    const adminActivityQuery = useMemoFirebase(
      () => createActivityQuery(firestore, ACTIVITY_COLLECTIONS.ADMIN),
      [firestore]
    );
    const operationsActivityQuery = useMemoFirebase(
      () => createActivityQuery(firestore, ACTIVITY_COLLECTIONS.OPERATIONS),
      [firestore]
    );
    const productionActivityQuery = useMemoFirebase(
      () => createActivityQuery(firestore, ACTIVITY_COLLECTIONS.PRODUCTION),
      [firestore]
    );
    const salesActivityQuery = useMemoFirebase(
      () => createActivityQuery(firestore, ACTIVITY_COLLECTIONS.SALES),
      [firestore]
    );

    // Combine all loading states
    const isLoading = isLoadingUsers || isLoadingAdminActivities || isLoadingOpsActivities || isLoadingProdBatches || isLoadingSalesLedger || isLoadingVanStock || isLoadingSalesReports;

    // --- UPDATED: Calculate "System Activities (24h)" ---
    const totalActivities24h = useMemo(() => {
        const adminCount = adminActivities?.length || 0;
        const opsCount = opsActivities?.length || 0;
        const prodCount = prodBatches?.length || 0;
        const salesLedgerCount = salesLedgerEntries?.length || 0;
        const vanStockCount = vanStockLogs?.length || 0;
        return adminCount + opsCount + prodCount + salesLedgerCount + vanStockCount;
    }, [adminActivities, opsActivities, prodBatches, salesLedgerEntries, vanStockLogs]);


    // --- State for Edit/Delete dialogs (Unchanged) ---
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);
    // --- NEW: State for viewing a sales report ---
    const [viewingReport, setViewingReport] = useState<DailySalesReport | null>(null);

    // (Activity Logger - unchanged)
    const logAdminActivity = async (action: string) => {
        const fakeAdminId = 'user-1'; 
        const currentAdminId = adminUser ? adminUser.uid : fakeAdminId;
        const currentUser = users?.find(u => u.id === currentAdminId); 
        const userName = currentUser?.name || 'Admin System';
        const userAvatar = currentUser?.avatarUrl || '';
        try {
            await addDoc(collection(firestore, 'admin_activities'), {
            action: action,
            user: { name: userName, avatarUrl: userAvatar },
            timestamp: serverTimestamp(),
            });
        } catch (error) {
            logger.error("Failed to log admin activity:", error);
        }
    };

    // (Delete User Handler - unchanged)
    async function handleDeleteUser() {
      if (!deletingUser) return;
      try {
        const userName = deletingUser.displayName || deletingUser.name || deletingUser.email;
        const docRef = doc(firestore, COLLECTIONS.USERS, deletingUser.uid);
        await deleteDoc(docRef);
        await logAdminActivity(`deleted user: ${userName} (${deletingUser.email})`);
        toast({ title: "User Deleted", description: `${userName} has been removed.` });
      } catch (error) {
        logger.error("Error deleting user:", error);
        toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete user." });
      } finally {
        setDeletingUser(null);
      }
    }


  return (
    <>
    <div className="flex flex-col gap-6">
        <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">
                Monitor all ERP data and user actions.
            </p>
        </div>

        {/* --- UPDATED: Stat Cards --- */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <UserIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{users?.length || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">all roles included</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">System Activities (24h)</CardTitle>
              <ActivityIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                 <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{totalActivities24h}</div> 
              )}
              <p className="text-xs text-muted-foreground">all module activities</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Sales (Today)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {/* NEW: Calculate total sales from ledger entries */}
              {isLoadingSalesLedger ? (
                 <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">
                  KSh { (salesLedgerEntries ?? []).reduce((acc, sale) => acc + sale.amountSold, 0).toLocaleString() }
                </div> 
              )}
              <p className="text-xs text-muted-foreground">from all sales agents</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Security Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div> 
              <p className="text-xs text-muted-foreground">e.g., failed logins (TODO)</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            {/* --- User Management Card (Unchanged) --- */}
            <Card>
                <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>
                        Overview of all users in the system.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                {isLoadingUsers ? (
                  <Skeleton className="h-40 w-full" />
                ) : (
                  <Table>
                      <TableHeader>
                      <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {(users ?? []).map((user: User) => {
                        const userName = user.displayName || user.name || 'Unknown User';
                        const userAvatar = user.photoURL || user.avatarUrl;
                        return (
                          <TableRow key={user.uid}>
                          <TableCell>
                              <div className="flex items-center gap-3">
                                  <Avatar className="h-9 w-9">
                                      <AvatarImage src={userAvatar} alt={userName} />
                                      <AvatarFallback>{userName.charAt(0).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <span className="font-medium">{userName}</span>
                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                  </div>
                              </div>
                          </TableCell>
                          <TableCell>
                              <Badge variant={roleConfig[user.role]?.variant || 'default'}>
                                  {roleConfig[user.role]?.label || user.role}
                              </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">User actions</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onSelect={() => setEditingUser(user)}>
                                    Edit Role
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive" 
                                    onSelect={() => setDeletingUser(user)}
                                  >
                                    Delete User
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                          </TableCell>
                          </TableRow>
                        );
                      })}
                      </TableBody>
                  </Table>
                )}
                </CardContent>
            </Card>
            
            {/* --- UPDATED: This card is now Daily Sales Reports --- */}
            <Card>
                <CardHeader>
                <CardTitle>Daily Sales Reports</CardTitle>
                <CardDescription>Review and print submitted sales reports.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isLoadingSalesReports ? (
                      <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : (
                      <>
                        {(dailySalesReports ?? []).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center">
                            No daily sales reports have been submitted yet.
                          </p>
                        )}
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Salesperson</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(dailySalesReports ?? []).map((report: DailySalesReport) => (
                              <TableRow key={report.id}>
                                <TableCell className="font-medium">{report.salespersonName}</TableCell>
                                <TableCell>{format(report.date.toDate(), 'PPP')}</TableCell>
                                <TableCell className="text-right">
                                  <Button variant="outline" size="sm" onClick={() => setViewingReport(report)}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    View & Print
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </>
                    )}
                </CardContent>
            </Card>
        </div>

        {/* --- NEW: System-Wide Activity Audit Trail --- */}
        <Card>
          <CardHeader>
            <CardTitle>System Activity Audit Trail</CardTitle>
            <CardDescription>
              Combined view of all activities across Admin, Operations, Production, and Sales modules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CombinedActivityLog
              queries={[
                {
                  query: adminActivityQuery,
                  label: 'Admin',
                  variant: 'destructive',
                },
                {
                  query: operationsActivityQuery,
                  label: 'Operations',
                  variant: 'default',
                },
                {
                  query: productionActivityQuery,
                  label: 'Production',
                  variant: 'secondary',
                },
                {
                  query: salesActivityQuery,
                  label: 'Sales',
                  variant: 'outline',
                },
              ]}
              maxItems={50}
              showSourceBadges={true}
              emptyMessage="No system activities logged yet."
            />
          </CardContent>
        </Card>
    </div>

    {/* --- Dialogs for User Management (Unchanged) --- */}
    <EditUserDialog
      user={editingUser}
      onOpenChange={() => setEditingUser(null)}
      onUserUpdated={(action) => logAdminActivity(action)}
    />
    <DeleteUserAlert
      user={deletingUser}
      onOpenChange={() => setDeletingUser(null)}
      onDelete={handleDeleteUser}
    />

    {/* --- NEW: Dialog for Sales Report --- */}
    <DailySalesReportSheet
      report={viewingReport}
      onOpenChange={() => setViewingReport(null)}
    />
    </> 
  );
}


// --- EditUserDialog Component (Unchanged, omitted for brevity) ---
function EditUserDialog({
  user,
  onOpenChange,
  onUserUpdated,
}: {
  user: User | null;
  onOpenChange: () => void;
  onUserUpdated: (action: string) => void;
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const editUserForm = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
  });

  useEffect(() => {
    if (user) {
      editUserForm.reset({ role: user.role });
    }
  }, [user, editUserForm]);

  async function onSubmitEditUser(data: EditUserFormValues) {
    if (!user) return;
    try {
      const userName = user.displayName || user.name || user.email;
      const docRef = doc(firestore, COLLECTIONS.USERS, user.uid);
      await updateDoc(docRef, { role: data.role });
      await onUserUpdated(`changed role for ${userName} to ${data.role}`);
      toast({ title: "User Role Updated", description: `${userName}'s role has been set to ${data.role}.` });
      onOpenChange();
    } catch (error) {
      logger.error("Error updating user role:", error);
      toast({ variant: "destructive", title: "Update Failed", description: "Could not update user role." });
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User Role</DialogTitle>
          <DialogDescription>
            You are editing the role for <strong className="mx-1">{user?.displayName || user?.name || user?.email}</strong> ({user?.email}).
          </DialogDescription>
        </DialogHeader>
        <Form {...editUserForm}>
          <form onSubmit={editUserForm.handleSubmit(onSubmitEditUser)} className="space-y-4 py-4">
            <FormField
              control={editUserForm.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {userRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {roleConfig[role].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onOpenChange}>Cancel</Button>
              <Button type="submit" disabled={editUserForm.formState.isSubmitting}>
                {editUserForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- DeleteUserAlert Component (Unchanged, omitted for brevity) ---
function DeleteUserAlert({
  user,
  onOpenChange,
  onDelete,
}: {
  user: User | null;
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
    <AlertDialog open={!!user} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the user
            <strong className="mx-1">{user?.name}</strong>
            from the Firestore database.
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
            Yes, delete user
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
