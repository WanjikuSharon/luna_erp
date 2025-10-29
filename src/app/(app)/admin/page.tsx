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
import { useFirestore, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

const roleConfig = {
    admin: { label: 'Admin', variant: 'destructive' as const },
    operations_manager: { label: 'Operations Manager', variant: 'default' as const },
    production_personnel: { label: 'Production', variant: 'secondary' as const },
}

export default function AdminDashboardPage() {
    const newLogoUrl = 'https://i.postimg.cc/9FzKTLkD/WhatsApp_Image_2025-10-15_at_00.18.06_514d4d8f.jpg';
    
    const firestore = useFirestore();

    // Memoize references
    const usersRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
    const activitiesRef = useMemoFirebase(() => collection(firestore, 'adminActivities'), [firestore]);

    // Fetch data
    const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersRef);
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

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <UserIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoadingUsers ? '...' : (users?.length ?? 0)}</div>
              <p className="text-xs text-muted-foreground">all roles included</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">System Activities</CardTitle>
              <ActivityIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,204</div>
              <p className="text-xs text-muted-foreground">in the last 24 hours</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-muted-foreground">require immediate attention</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Security Events</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
              <p className="text-xs text-muted-foreground">in the last 7 days</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>
                        Overview of all users in the system.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                {isLoadingUsers ? (
                    <div className="space-y-3">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
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
                                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{user.name}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                            <Badge variant={roleConfig[user.role].variant}>
                                {roleConfig[user.role].label}
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
            <Card>
                <CardHeader>
                <CardTitle>System Audit Log</CardTitle>
                <CardDescription>Recent high-level system and user activities.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isLoadingActivities ? (
                        <div className="space-y-3">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : (adminActivities && adminActivities.length > 0) ? (
                        adminActivities.map((activity: Activity) => (
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
                                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground">No activities yet. Activities will appear here once users start interacting with the system.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
