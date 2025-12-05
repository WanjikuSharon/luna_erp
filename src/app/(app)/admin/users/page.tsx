// src/app/(app)/admin/users/page.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  updateUserRoleSchema,
  type UpdateUserRoleFormValues,
} from '@/lib/schemas';
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
import type { User } from '@/lib/types';
import { MoreHorizontal, User as UserIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore'; 
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
import { TableSkeleton } from '@/components/skeletons';

const roleConfig = {
    admin: { label: 'Admin', variant: 'destructive' as const },
    operations_manager: { label: 'Operations Manager', variant: 'default' as const },
    production_personnel: { label: 'Production Personnel', variant: 'secondary' as const },
    sales: { label: 'Sales', variant: 'default' as const },
    operations: { label: 'Operations', variant: 'default' as const },
    production: { label: 'Production', variant: 'secondary' as const },
};
const userRoles = Object.keys(roleConfig) as (keyof typeof roleConfig)[];

export default function UserManagementPage() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user: adminUser } = useUser();
    
    const usersRef = useMemoFirebase(() => collection(firestore, COLLECTIONS.USERS), [firestore]);
    const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersRef);
    
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);

    // Log admin activities
    const logAdminActivity = async (action: string) => {
      if (!adminUser?.email || !firestore) return;
      try {
        await addDoc(collection(firestore, 'admin_activities'), {
          action,
          userId: adminUser.uid,
          userName: adminUser.displayName || adminUser.email,
          timestamp: serverTimestamp(),
        });
      } catch (error) {
        console.error('Failed to log activity:', error);
      }
    };

    const handleDeleteUser = async () => {
      if (!deletingUser || !firestore) return;
      
      try {
        await deleteDoc(doc(firestore, COLLECTIONS.USERS, deletingUser.id));
        await logAdminActivity(`Deleted user: ${deletingUser.name}`);
        toast({ title: 'User deleted successfully' });
        setDeletingUser(null);
      } catch (error) {
        console.error('Error deleting user:', error);
        toast({ 
          title: 'Failed to delete user', 
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive'
        });
      }
    };

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight md:text-3xl">
            User Management
          </h1>
          <p className="text-muted-foreground">Manage system users and their roles</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              System Users
            </CardTitle>
            <CardDescription>
              Manage user accounts and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingUsers ? (
              <TableSkeleton rows={5} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users && users.length > 0 ? (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.photoURL || ''} alt={user.name || ''} />
                              <AvatarFallback>
                                {user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span>{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={roleConfig[user.role]?.variant || 'default'}>
                            {roleConfig[user.role]?.label || user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.createdAt ? format(user.createdAt.toDate(), 'PPp') : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setEditingUser(user)}>
                                Edit Role
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => setDeletingUser(user)}
                              >
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

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
      </div>
    );
}

// Edit User Dialog Component
function EditUserDialog({ 
  user, 
  onOpenChange, 
  onUserUpdated 
}: { 
  user: User | null; 
  onOpenChange: (open: boolean) => void;
  onUserUpdated: (action: string) => void;
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isUpdating, setIsUpdating] = useState(false);

  const form = useForm<UpdateUserRoleFormValues>({
    resolver: zodResolver(updateUserRoleSchema),
    values: user ? { role: user.role } : undefined,
  });

  const handleUpdateRole = async (values: UpdateUserRoleFormValues) => {
    if (!user || !firestore) return;
    
    setIsUpdating(true);
    try {
      await updateDoc(doc(firestore, COLLECTIONS.USERS, user.id), {
        role: values.role,
      });
      
      await onUserUpdated(`Updated role for ${user.name} to ${values.role}`);
      toast({ title: 'User role updated successfully' });
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({ 
        title: 'Failed to update user role', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User Role</DialogTitle>
          <DialogDescription>
            Change the role for {user?.name}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleUpdateRole)} className="space-y-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Role
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Delete User Alert Component
function DeleteUserAlert({ 
  user, 
  onOpenChange, 
  onDelete 
}: { 
  user: User | null; 
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <AlertDialog open={!!user} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the user account for {user?.name}. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={onDelete}>
            Delete User
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
