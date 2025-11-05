// src/app/(app)/admin/page.tsx
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { User, Activity } from '@/lib/types';
import { MoreHorizontal, User as UserIcon, Activity as ActivityIcon, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

// NEW: Import Firebase hooks and services
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { COLLECTIONS } from '@/services/inventory_service';

// Role config from original file
const roleConfig = {
    admin: { label: 'Admin', variant: 'destructive' as const },
    operations_manager: { label: 'Operations Manager', variant: 'default' as const },
    production_personnel: { label: 'Production', variant: 'secondary' as const },
}

export default function AdminDashboardPage() {
    // const newLogoUrl = '...'; // This was in the original file, but not used.
    
    // --- NEW: Fetch Live Data ---
    const firestore = useFirestore();

    const usersRef = useMemoFirebase(
      () => collection(firestore, COLLECTIONS.USERS),
      [firestore]
    );
    const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersRef);

    const activitiesRef = useMemoFirebase(
      () => query(collection(firestore, 'admin_activities'), orderBy('timestamp', 'desc')),
      [firestore]
    );
    const { data: adminActivities, isLoading: isLoadingActivities } = useCollection<Activity>(activitiesRef);

    const isLoading = isLoadingUsers || isLoadingActivities;

  return (
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
              {/* TODO: We can calculate this from logs later */}
              <div className="text-2xl font-bold">...</div> 
              <p className="text-xs text-muted-foreground">in the last 24 hours</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div> 
              <p className="text-xs text-muted-foreground">require immediate attention</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Security Events</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div> 
              <p className="text-xs text-muted-foreground">in the last 7 days</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            {/* --- UPDATED: User Management Card --- */}
            <Card>
                <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>
                        Overview of all users in the system.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                {isLoadingUsers ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <Table>
                      <TableHeader>
                      <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {(users ?? []).map((user: User) => (
                          <TableRow key={user.id}>
                          <TableCell>
                              <div className="flex items-center gap-3">
                                  <Avatar className="h-9 w-9">
                                      {/* Use user.avatarUrl, fallback to newLogoUrl or name */}
                                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">{user.name}</span>
                              </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{user.email}</TableCell>
                          <TableCell>
                              {/* Use roleConfig, provide a default if role is not in config */}
                              <Badge variant={roleConfig[user.role]?.variant || 'default'}>
                                  {roleConfig[user.role]?.label || user.role}
                              </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                              <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">User actions</span>
                              </Button>
                          </TableCell>
                          </TableRow>
                      ))}
                      </TableBody>
                  </Table>
                )}
                </CardContent>
            </Card>
            
            {/* --- UPDATED: System Audit Log Card --- */}
            <Card>
                <CardHeader>
                <CardTitle>System Audit Log</CardTitle>
                <CardDescription>Recent high-level system and user activities.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isLoadingActivities ? (
                      <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : (
                      <>
                        {(adminActivities ?? []).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center">
                            No admin activities have been logged yet.
                          </p>
                        )}
                        {(adminActivities ?? []).map((activity: Activity) => (
                            <div key={activity.id} className="flex items-start gap-4">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={activity.user.avatarUrl} alt={activity.user.name} />
                                    <AvatarFallback>{activity.user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="text-sm">
                                    <p className="font-medium">
                                        {activity.user.name}{' '}
                                        <span className="text-muted-foreground font-normal">{activity.action.toLowerCase()}</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {activity.timestamp?.toDate ? 
                                          formatDistanceToNow(activity.timestamp.toDate(), { addSuffix: true }) :
                                          'just now'
                                        }
                                    </p>
                                </div>
                            </div>
                        ))}
                      </>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
