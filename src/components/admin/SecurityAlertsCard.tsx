// src/components/admin/SecurityAlertsCard.tsx
'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle, Shield, Info } from 'lucide-react';
import { useSecurityEvents } from '@/hooks/use-security-events';
import { 
  getSeverityVariant, 
  getSeverityColor, 
  getEventTypeLabel,
  type SecurityEvent 
} from '@/services/security_service';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function SecurityAlertsCard() {
  const { events, isLoading } = useSecurityEvents(20);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  const unresolvedCount = events.filter(e => !e.resolved).length;
  const criticalCount = events.filter(e => e.severity === 'critical' && !e.resolved).length;

  const handleResolve = async (eventId: string) => {
    try {
      const eventRef = doc(firestore, 'security_events', eventId);
      await updateDoc(eventRef, {
        resolved: true,
        resolvedAt: serverTimestamp(),
      });

      toast({
        title: 'Event Resolved',
        description: 'Security event has been marked as resolved',
      });
      setSelectedEvent(null);
    } catch (error) {
      toast({
        title: 'Failed to Resolve',
        description: 'Could not mark event as resolved',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Security Alerts</CardTitle>
              <CardDescription>Recent security events and suspicious activity</CardDescription>
            </div>
            <div className="flex gap-2">
              {criticalCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {criticalCount} Critical
                </Badge>
              )}
              {unresolvedCount > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Shield className="h-3 w-3" />
                  {unresolvedCount} Unresolved
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No security events recorded</p>
              <p className="text-xs mt-1">All systems secure</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow 
                      key={event.id}
                      className={event.resolved ? 'opacity-50' : ''}
                    >
                      <TableCell className="font-medium">
                        {getEventTypeLabel(event.type)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSeverityVariant(event.severity)}>
                          {event.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {event.details}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {event.email || event.userId || 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {event.timestamp?.toDate 
                          ? formatDistanceToNow(event.timestamp.toDate(), { addSuffix: true })
                          : 'Just now'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEvent(event)}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className={selectedEvent ? getSeverityColor(selectedEvent.severity) : ''} />
              Security Event Details
            </DialogTitle>
            <DialogDescription>
              {selectedEvent && getEventTypeLabel(selectedEvent.type)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Severity</p>
                <Badge variant={getSeverityVariant(selectedEvent.severity)}>
                  {selectedEvent.severity.toUpperCase()}
                </Badge>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Details</p>
                <p className="text-sm text-muted-foreground">{selectedEvent.details}</p>
              </div>

              {selectedEvent.email && (
                <div>
                  <p className="text-sm font-medium mb-1">Email</p>
                  <p className="text-sm text-muted-foreground">{selectedEvent.email}</p>
                </div>
              )}

              {selectedEvent.ipAddress && (
                <div>
                  <p className="text-sm font-medium mb-1">IP Address</p>
                  <p className="text-sm text-muted-foreground font-mono">{selectedEvent.ipAddress}</p>
                </div>
              )}

              {selectedEvent.userAgent && (
                <div>
                  <p className="text-sm font-medium mb-1">User Agent</p>
                  <p className="text-sm text-muted-foreground break-all">{selectedEvent.userAgent}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-1">Timestamp</p>
                <p className="text-sm text-muted-foreground">
                  {selectedEvent.timestamp?.toDate 
                    ? new Date(selectedEvent.timestamp.toDate()).toLocaleString()
                    : 'Unknown'}
                </p>
              </div>

              {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Additional Info</p>
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {selectedEvent.resolved && (
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <p className="text-sm text-green-600">
                    Resolved {selectedEvent.resolvedAt?.toDate 
                      ? formatDistanceToNow(selectedEvent.resolvedAt.toDate(), { addSuffix: true })
                      : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>
              Close
            </Button>
            {selectedEvent && !selectedEvent.resolved && (
              <Button onClick={() => handleResolve(selectedEvent.id!)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark as Resolved
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
