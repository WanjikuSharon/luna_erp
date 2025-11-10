'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User as UserType } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function ProfilePage() {
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const newLogoUrl = 'https://i.postimg.cc/9FzKTLkD/WhatsApp_Image_2025-10-15_at_00.18.06_514d4d8f.jpg';

  const userDocRef = useMemoFirebase(
    () => (authUser ? doc(firestore, 'users', authUser.uid) : null),
    [firestore, authUser]
  );
  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserType>(userDocRef);

  if (isUserLoading || isUserDataLoading) {
    return (
      <div className="container mx-auto py-10">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>Unable to load your profile information.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const displayName = userData.displayName || userData.name || authUser?.email?.split('@')[0] || 'User';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  // Format role for display
  const roleDisplay = userData.role === 'operations_manager' ? 'Operations Manager' 
    : userData.role === 'production_personnel' ? 'Production Personnel'
    : userData.role.charAt(0).toUpperCase() + userData.role.slice(1);

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">View and manage your account information</p>
      </div>

      <div className="grid gap-6">
        {/* Profile Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your personal details and account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={userData.avatarUrl || userData.photoURL || newLogoUrl} alt={displayName} />
                <AvatarFallback className="text-2xl">{avatarLetter}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">{displayName}</h3>
                <Badge variant="secondary" className="mt-1">{roleDisplay}</Badge>
              </div>
            </div>

            {/* User Details */}
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={displayName} disabled />
              </div>

              <div className="grid gap-2">
                <Label>Email</Label>
                <Input value={userData.email} disabled />
              </div>

              <div className="grid gap-2">
                <Label>Role</Label>
                <Input value={roleDisplay} disabled />
              </div>

              {userData.department && (
                <div className="grid gap-2">
                  <Label>Department</Label>
                  <Input value={userData.department} disabled />
                </div>
              )}

              {userData.phoneNumber && (
                <div className="grid gap-2">
                  <Label>Phone Number</Label>
                  <Input value={userData.phoneNumber} disabled />
                </div>
              )}

              <div className="grid gap-2">
                <Label>Account Status</Label>
                <Input 
                  value={userData.isActive ? 'Active' : 'Inactive'} 
                  disabled 
                  className={userData.isActive ? 'text-green-600' : 'text-red-600'}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                To update your profile information, please contact the ICT department.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings Card */}
        {userData.notificationSettings && (
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Your notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Email Notifications</Label>
                <Input 
                  value={userData.notificationSettings.receiveEmails ? 'Enabled' : 'Disabled'} 
                  disabled 
                />
              </div>

              <div className="grid gap-2">
                <Label>Report Frequency</Label>
                <Input 
                  value={userData.notificationSettings.reportFrequency.charAt(0).toUpperCase() + 
                         userData.notificationSettings.reportFrequency.slice(1)} 
                  disabled 
                />
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  To change notification settings, please contact the ICT department.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
